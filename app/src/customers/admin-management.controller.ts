import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { BagLedgerService } from '../bags/bag-ledger.service';
import { CurrentUser, Roles, User } from '../common/auth';
import { DomainError } from '../common/errors';
import { parse } from '../common/validate';
import { Db, DB } from '../db/db';
import { addresses, orders, users } from '../db/schema';

const createRiderSchema = z.object({
  lineUserId: z.string().min(1).max(100), name: z.string().min(1).max(100),
  phone: z.string().max(30).optional(), vehicle: z.string().max(100).optional(), zone: z.string().max(50).optional(),
});

const updateRiderSchema = z.object({
  name: z.string().min(1).max(100).optional(), phone: z.string().max(30).optional(),
  vehicle: z.string().max(100).optional(), zone: z.string().max(50).optional(), active: z.boolean().optional(),
});

const createCustomerSchema = z.object({
  lineUserId: z.string().min(1).max(100), name: z.string().min(1).max(100), phone: z.string().min(9).max(20),
  creditLimitSatang: z.number().int().min(0).default(100000), addressLabel: z.string().min(1).max(50).default('บ้าน'),
  addressDetail: z.string().min(1).max(500), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(100).optional(), phone: z.string().min(9).max(20).optional(),
  creditLimitSatang: z.number().int().min(0).optional(), active: z.boolean().optional(),
  addressDetail: z.string().min(1).max(500).optional(), lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional(),
});

const preferencesSchema = z.object({ viewMode: z.enum(['card', 'grid']) });

@Controller('admin')
@Roles('admin', 'warehouse')
export class AdminManagementController {
  private prefsTableReady = false;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly bags: BagLedgerService,
  ) {}

  private async ensurePrefsTable() {
    if (this.prefsTableReady) return;
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        view_mode TEXT NOT NULL DEFAULT 'card',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    this.prefsTableReady = true;
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() u: User) {
    await this.ensurePrefsTable();
    const res = await this.db.execute<{ view_mode: string }>(
      sql`SELECT view_mode FROM user_preferences WHERE user_id = ${u.id} LIMIT 1`,
    );
    const mode = res.rows[0]?.view_mode === 'grid' ? 'grid' : 'card';
    return { viewMode: mode };
  }

  @Patch('preferences')
  async updatePreferences(@CurrentUser() u: User, @Body() body: unknown) {
    const b = parse(preferencesSchema, body);
    await this.ensurePrefsTable();
    await this.db.execute(sql`
      INSERT INTO user_preferences (user_id, view_mode, updated_at)
      VALUES (${u.id}, ${b.viewMode}, now())
      ON CONFLICT (user_id) DO UPDATE SET view_mode = EXCLUDED.view_mode, updated_at = now()
    `);
    return { viewMode: b.viewMode };
  }

  @Get('riders')
  listRiders() {
    return this.db.select().from(users).where(eq(users.role, 'rider')).orderBy(asc(users.createdAt));
  }

  @Post('riders')
  async createRider(@Body() body: unknown) {
    const b = parse(createRiderSchema, body);
    const [r] = await this.db.insert(users).values({ ...b, role: 'rider', active: true }).onConflictDoNothing().returning();
    if (!r) throw new DomainError(409, 'USER_EXISTS', 'รหัส LINE นี้ถูกใช้งานแล้ว');
    return r;
  }

  @Patch('riders/:id')
  async updateRider(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: unknown) {
    const b = parse(updateRiderSchema, body);
    const [r] = await this.db.update(users).set(b).where(and(eq(users.id, id), eq(users.role, 'rider'))).returning();
    if (!r) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบไรเดอร์');
    return r;
  }

  @Get('customers')
  async listCustomers() {
    const custs = await this.db.select().from(users).where(eq(users.role, 'customer')).orderBy(asc(users.createdAt));
    const result = [];
    for (const c of custs) {
      const [addr] = await this.db.select().from(addresses).where(eq(addresses.userId, c.id)).orderBy(asc(addresses.createdAt)).limit(1);
      const [{ used }] = await this.db
        .select({ used: sql<number>`coalesce(sum(${orders.totalSatang}), 0)::int` })
        .from(orders)
        .where(and(eq(orders.customerId, c.id), eq(orders.paymentMethod, 'CREDIT'), ne(orders.paymentStatus, 'PAID'), ne(orders.status, 'CANCELLED')));
      result.push({
        ...c,
        addressId: addr?.id ?? null, addressLabel: addr?.label ?? 'บ้าน', addressDetail: addr?.detail ?? '',
        lat: addr?.lat ?? 13.7563, lng: addr?.lng ?? 100.5018, creditUsedSatang: used,
        bagBalance: await this.bags.balance(c.id),
      });
    }
    return result;
  }

  @Post('customers')
  async createCustomer(@Body() body: unknown) {
    const b = parse(createCustomerSchema, body);
    const [u] = await this.db
      .insert(users)
      .values({ lineUserId: b.lineUserId, role: 'customer', name: b.name, phone: b.phone, creditLimitSatang: b.creditLimitSatang, pdpaConsentAt: new Date() })
      .onConflictDoNothing()
      .returning();
    if (!u) throw new DomainError(409, 'USER_EXISTS', 'รหัส LINE นี้ถูกใช้งานแล้ว');
    const [addr] = await this.db.insert(addresses).values({ userId: u.id, label: b.addressLabel, detail: b.addressDetail, lat: b.lat, lng: b.lng }).returning();
    return { ...u, addressId: addr.id, addressDetail: addr.detail, lat: addr.lat, lng: addr.lng };
  }

  @Patch('customers/:id')
  async updateCustomer(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: unknown) {
    const b = parse(updateCustomerSchema, body);
    const userPatch: Partial<typeof users.$inferInsert> = {};
    if (b.name !== undefined) userPatch.name = b.name;
    if (b.phone !== undefined) userPatch.phone = b.phone;
    if (b.creditLimitSatang !== undefined) userPatch.creditLimitSatang = b.creditLimitSatang;
    if (b.active !== undefined) userPatch.active = b.active;

    let [u] = await this.db.select().from(users).where(and(eq(users.id, id), eq(users.role, 'customer')));
    if (!u) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบข้อมูลลูกค้า');
    if (Object.keys(userPatch).length > 0) {
      [u] = await this.db.update(users).set(userPatch).where(eq(users.id, id)).returning();
    }

    const [addr] = await this.db.select().from(addresses).where(eq(addresses.userId, id)).orderBy(asc(addresses.createdAt)).limit(1);
    if (addr && (b.addressDetail !== undefined || b.lat !== undefined || b.lng !== undefined)) {
      await this.db
        .update(addresses)
        .set({ detail: b.addressDetail ?? addr.detail, lat: b.lat ?? addr.lat, lng: b.lng ?? addr.lng })
        .where(eq(addresses.id, addr.id));
    }
    return u;
  }
}
