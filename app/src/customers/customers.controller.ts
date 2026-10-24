import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { BagLedgerService } from '../bags/bag-ledger.service';
import { AllowUnregistered, Auth, AuthContext, CurrentUser, Roles, User } from '../common/auth';
import { DomainError } from '../common/errors';
import { parse } from '../common/validate';
import { Db, DB } from '../db/db';
import { addresses, users } from '../db/schema';

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^0\d{8,9}$/, 'เบอร์โทรไม่ถูกต้อง'),
  pdpaConsent: z.literal(true, { message: 'ต้องยอมรับนโยบายข้อมูลส่วนบุคคล' }),
  customerType: z.enum(['individual', 'business']).default('individual'),
});
const addressSchema = z.object({
  label: z.string().min(1).max(50),
  detail: z.string().min(1).max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  note: z.string().max(300).optional(),
});

@Controller('me')
export class MeController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly bags: BagLedgerService,
  ) {}

  /** ลงทะเบียนลูกค้าใหม่ (FR-C01): ผูก LINE userId กับเบอร์โทร ต้องยอมรับ PDPA */
  @Post('register')
  @AllowUnregistered()
  async register(@Auth() auth: AuthContext, @Body() body: unknown) {
    if (auth.user) throw new DomainError(409, 'ALREADY_REGISTERED', 'ลงทะเบียนแล้ว');
    const b = parse(registerSchema, body);
    const [u] = await this.db
      .insert(users)
      .values({ lineUserId: auth.lineUserId, role: 'customer', name: b.name, phone: b.phone, customerType: b.customerType, pdpaConsentAt: new Date() })
      .onConflictDoNothing()
      .returning();
    if (!u) throw new DomainError(409, 'ALREADY_REGISTERED', 'ลงทะเบียนแล้ว');
    return u;
  }

  @Get()
  me(@CurrentUser() u: User) {
    return u;
  }

  @Get('addresses')
  @Roles('customer')
  listAddresses(@CurrentUser() u: User) {
    return this.db.select().from(addresses).where(eq(addresses.userId, u.id)).orderBy(asc(addresses.createdAt));
  }

  @Post('addresses')
  @Roles('customer')
  async addAddress(@CurrentUser() u: User, @Body() body: unknown) {
    const [a] = await this.db.insert(addresses).values({ ...parse(addressSchema, body), userId: u.id }).returning();
    return a;
  }

  /** ยอดถุงค้างและประวัติ (FR-C07) */
  @Get('bags')
  @Roles('customer')
  async myBags(@CurrentUser() u: User) {
    return { balance: await this.bags.balance(u.id), history: await this.bags.history(u.id) };
  }
}

const writeOffSchema = z.object({ qty: z.number().int().min(1).max(1000), note: z.string().min(1).max(500) });

@Controller('admin/customers')
export class AdminCustomersController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly bags: BagLedgerService,
  ) {}

  @Get(':id/bags')
  @Roles('admin')
  async bagsOf(@Param('id', new ParseUUIDPipe()) id: string) {
    return { balance: await this.bags.balance(id), history: await this.bags.history(id) };
  }

  /** ตัดยอดถุงที่ลูกค้าทำหายหรือคิดเงินแล้ว (WRITTEN_OFF) */
  @Post(':id/bags/write-off')
  @Roles('admin')
  async writeOff(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() admin: User, @Body() body: unknown) {
    const b = parse(writeOffSchema, body);
    const [c] = await this.db.select().from(users).where(and(eq(users.id, id), eq(users.role, 'customer')));
    if (!c) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบลูกค้า');
    return this.db.transaction(async (tx) => {
      const bal = await this.bags.balance(id, tx);
      if (b.qty > bal) throw new DomainError(422, 'BAGS_EXCEED_BALANCE', `ลูกค้ามีถุงค้าง ${bal} ใบ`);
      await this.bags.writeOff(tx, { customerId: id, qty: b.qty, by: admin.id, note: b.note });
      return { balance: await this.bags.balance(id, tx) };
    });
  }
}
