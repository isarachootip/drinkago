import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { asc, eq, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { CurrentUser, Public, Roles, User } from '../common/auth';
import { DomainError } from '../common/errors';
import { hashPassword, signStaffToken, verifyPassword } from '../common/password';
import { parse } from '../common/validate';
import { APP_CONFIG, AppConfig } from '../config';
import { Db, DB } from '../db/db';
import {
  addresses,
  bagLedger,
  idempotencyKeys,
  notificationOutbox,
  orderEvents,
  orders,
  stationBagLedger,
  users,
} from '../db/schema';

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

const createUserSchema = z.object({
  username: z.string().min(2).max(60).optional(),
  password: z.string().min(4).max(200).optional(),
  lineUserId: z.string().min(1).max(100).optional(),
  role: z.enum(['customer', 'warehouse', 'rider', 'admin']),
  name: z.string().min(1).max(100),
  phone: z.string().max(30).optional(),
  vehicle: z.string().max(100).optional(),
  zone: z.string().max(50).optional(),
  creditLimitSatang: z.number().int().min(0).optional(),
  active: z.boolean().default(true),
});

const updateUserSchema = z.object({
  username: z.string().min(2).max(60).nullable().optional(),
  password: z.string().min(4).max(200).optional(),
  lineUserId: z.string().min(1).max(100).optional(),
  role: z.enum(['customer', 'warehouse', 'rider', 'admin']).optional(),
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).nullable().optional(),
  vehicle: z.string().max(100).nullable().optional(),
  zone: z.string().max(50).nullable().optional(),
  creditLimitSatang: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

function sanitizeUser(u: User) {
  const { passwordHash, ...rest } = u;
  return { ...rest, hasPassword: Boolean(passwordHash) };
}

@Controller()
export class UsersAdminController {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  @Post('auth/login')
  @Public()
  @HttpCode(200)
  async login(@Body() body: unknown) {
    const b = parse(loginSchema, body);
    const [u] = await this.db.select().from(users).where(eq(users.username, b.username.trim())).limit(1);
    if (!u || !u.active || !verifyPassword(b.password, u.passwordHash)) {
      throw new DomainError(401, 'INVALID_CREDENTIALS', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (หรือบัญชีถูกระงับ)');
    }
    const token = await signStaffToken(
      { id: u.id, lineUserId: u.lineUserId, role: u.role },
      this.cfg.DEV_AUTH_KEY ?? this.cfg.LINE_CHANNEL_SECRET,
    );
    return { token, user: sanitizeUser(u) };
  }

  @Get('admin/users')
  @Roles('admin')
  async listUsers() {
    const all = await this.db.select().from(users).orderBy(asc(users.createdAt));
    return all.map(sanitizeUser);
  }

  @Post('admin/users')
  @Roles('admin')
  async createUser(@Body() body: unknown) {
    const b = parse(createUserSchema, body);
    const lineUserId = b.lineUserId?.trim() || `U_${b.role}_${Date.now()}`;
    const username = b.username?.trim() || null;
    const passwordHash = b.password ? hashPassword(b.password) : null;

    try {
      const [created] = await this.db
        .insert(users)
        .values({
          lineUserId,
          username,
          passwordHash,
          role: b.role,
          name: b.name.trim(),
          phone: b.phone?.trim() || null,
          vehicle: b.vehicle?.trim() || null,
          zone: b.zone?.trim() || null,
          creditLimitSatang: b.creditLimitSatang ?? 100000,
          active: b.active,
          pdpaConsentAt: new Date(),
        })
        .returning();
      return sanitizeUser(created);
    } catch {
      throw new DomainError(409, 'USER_CONFLICT', 'Username หรือ LINE User ID นี้ถูกใช้งานแล้ว');
    }
  }

  @Patch('admin/users/:id')
  @Roles('admin')
  async updateUser(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: unknown) {
    const b = parse(updateUserSchema, body);
    const patch: Partial<typeof users.$inferInsert> = {};
    if (b.username !== undefined) patch.username = b.username ? b.username.trim() : null;
    if (b.password) patch.passwordHash = hashPassword(b.password);
    if (b.lineUserId !== undefined) patch.lineUserId = b.lineUserId.trim();
    if (b.role !== undefined) patch.role = b.role;
    if (b.name !== undefined) patch.name = b.name.trim();
    if (b.phone !== undefined) patch.phone = b.phone ? b.phone.trim() : null;
    if (b.vehicle !== undefined) patch.vehicle = b.vehicle ? b.vehicle.trim() : null;
    if (b.zone !== undefined) patch.zone = b.zone ? b.zone.trim() : null;
    if (b.creditLimitSatang !== undefined) patch.creditLimitSatang = b.creditLimitSatang;
    if (b.active !== undefined) patch.active = b.active;

    try {
      const [updated] = await this.db.update(users).set(patch).where(eq(users.id, id)).returning();
      if (!updated) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบผู้ใช้งาน');
      return sanitizeUser(updated);
    } catch (e) {
      if (e instanceof DomainError) throw e;
      throw new DomainError(409, 'USER_CONFLICT', 'Username หรือ LINE User ID ซ้ำกับผู้ใช้อื่น');
    }
  }

  @Delete('admin/users/:id')
  @Roles('admin')
  async deleteUser(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() admin: User) {
    if (id === admin.id) {
      throw new DomainError(400, 'CANNOT_DELETE_SELF', 'ไม่สามารถลบบัญชีที่กำลังล็อกอินอยู่ได้');
    }
    const [target] = await this.db.select().from(users).where(eq(users.id, id));
    if (!target) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบผู้ใช้งาน');

    const [{ ordCount }] = await this.db
      .select({ ordCount: sql<number>`count(*)::int` })
      .from(orders)
      .where(or(eq(orders.customerId, id), eq(orders.riderId, id)));
    const [{ evCount }] = await this.db
      .select({ evCount: sql<number>`count(*)::int` })
      .from(orderEvents)
      .where(eq(orderEvents.actorId, id));
    const [{ bagCount }] = await this.db
      .select({ bagCount: sql<number>`count(*)::int` })
      .from(bagLedger)
      .where(or(eq(bagLedger.customerId, id), eq(bagLedger.confirmedBy, id)));
    const [{ stBagCount }] = await this.db
      .select({ stBagCount: sql<number>`count(*)::int` })
      .from(stationBagLedger)
      .where(or(eq(stationBagLedger.customerId, id), eq(stationBagLedger.actorId, id)));

    if (ordCount + evCount + bagCount + stBagCount > 0) {
      const [soft] = await this.db.update(users).set({ active: false }).where(eq(users.id, id)).returning();
      return { id, deleted: true, mode: 'SOFT_DELETE' as const, active: soft.active };
    }

    await this.db.transaction(async (tx) => {
      await tx.delete(addresses).where(eq(addresses.userId, id));
      await tx.delete(notificationOutbox).where(eq(notificationOutbox.userId, id));
      await tx.delete(idempotencyKeys).where(eq(idempotencyKeys.userId, id));
      await tx.delete(users).where(eq(users.id, id));
    });
    return { id, deleted: true, mode: 'HARD_DELETE' as const, active: false };
  }
}
