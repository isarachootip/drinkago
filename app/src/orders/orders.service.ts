import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { randomInt, timingSafeEqual } from 'node:crypto';
import { BagLedgerService } from '../bags/bag-ledger.service';
import { User } from '../common/auth';
import { DomainError } from '../common/errors';
import { APP_CONFIG, AppConfig } from '../config';
import { Db, DB, DbOrTx } from '../db/db';
import { addresses, orderEvents, orderItems, orders, payments, products, users } from '../db/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { ActorRole, assertTransition, Evidence, OrderStatus } from './order-state-machine';

export type Order = typeof orders.$inferSelect;

export interface Actor {
  id: string | null;
  role: ActorRole;
}
export const SYSTEM: Actor = { id: null, role: 'system' };
const actorOf = (u: User): Actor => ({ id: u.id, role: u.role });

export interface CreateOrderInput {
  addressId: string;
  items: { productId: number; qty: number }[];
  expectBagReturn: number;
  paymentMethod: 'CASH' | 'PROMPTPAY';
  slotStart?: Date;
  slotEnd?: Date;
}

const baht = (satang: number) => (satang / 100).toFixed(2);

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    private readonly bags: BagLedgerService,
    private readonly notify: NotificationsService,
  ) {}

  // ---------------------------------------------------------------- แกนกลาง

  /**
   * จุดเดียวที่เปลี่ยนสถานะออเดอร์ได้: ตรวจกฎ → บันทึก order_events → อัปเดต status
   * ต้องเรียกภายใน transaction ที่ล็อกแถวออเดอร์แล้ว (ดู withLockedOrder)
   */
  async transition(
    tx: DbOrTx,
    order: Order,
    to: OrderStatus,
    actor: Actor,
    opts: { evidence?: Evidence; note?: string; data?: Record<string, unknown> } = {},
  ): Promise<Order> {
    assertTransition({
      from: order.status,
      to,
      role: actor.role,
      actorId: actor.id ?? undefined,
      assignedRiderId: order.riderId,
      evidence: opts.evidence,
    });
    await tx.insert(orderEvents).values({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: to,
      actorId: actor.id,
      actorRole: actor.role,
      lat: opts.evidence?.lat,
      lng: opts.evidence?.lng,
      photoUrl: opts.evidence?.photoUrl,
      note: opts.note,
      data: opts.data,
    });
    const [updated] = await tx
      .update(orders)
      .set({ status: to, updatedAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
      .returning();
    if (!updated) throw new DomainError(409, 'CONCURRENT_UPDATE', 'ออเดอร์ถูกแก้ไขพร้อมกัน ลองใหม่อีกครั้ง');
    return updated;
  }

  /** เปิด transaction และล็อกแถวออเดอร์ (SELECT … FOR UPDATE) กันสองคนกดพร้อมกัน */
  private withLockedOrder<T>(orderId: string, fn: (tx: DbOrTx, order: Order) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
      if (!order) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบออเดอร์');
      return fn(tx, order);
    });
  }

  // ---------------------------------------------------------------- ลูกค้า (ขั้น 1)

  async create(customer: User, input: CreateOrderInput): Promise<Order> {
    if (input.items.length === 0) throw new DomainError(400, 'EMPTY_ORDER', 'ต้องมีสินค้าอย่างน้อย 1 รายการ');
    return this.db.transaction(async (tx) => {
      const [addr] = await tx.select().from(addresses).where(and(eq(addresses.id, input.addressId), eq(addresses.userId, customer.id)));
      if (!addr) throw new DomainError(404, 'ADDRESS_NOT_FOUND', 'ไม่พบที่อยู่นี้');

      const ids = [...new Set(input.items.map((i) => i.productId))];
      const prods = await tx.select().from(products).where(and(inArray(products.id, ids), eq(products.active, true)));
      if (prods.length !== ids.length) throw new DomainError(400, 'PRODUCT_UNAVAILABLE', 'มีสินค้าที่ไม่พร้อมขาย');
      const byId = new Map(prods.map((p) => [p.id, p]));

      const lines = input.items.map((i) => {
        const p = byId.get(i.productId)!;
        return { productId: p.id, qty: i.qty, priceSatang: p.priceSatang, isReturnable: p.isReturnable };
      });
      const total = lines.reduce((s, l) => s + l.qty * l.priceSatang, 0);

      // ลูกค้าแจ้งคืนถุงได้ไม่เกินยอดค้าง
      const balance = await this.bags.balance(customer.id, tx);
      if (input.expectBagReturn > balance) {
        throw new DomainError(422, 'BAGS_EXCEED_BALANCE', `คุณมีถุงค้าง ${balance} ใบ แจ้งคืน ${input.expectBagReturn} ใบไม่ได้`);
      }

      const [order] = await tx
        .insert(orders)
        .values({
          code: `DG-${Date.now().toString(36).toUpperCase()}${randomInt(36 ** 2).toString(36).toUpperCase().padStart(2, '0')}`,
          customerId: customer.id,
          addressId: addr.id,
          paymentMethod: input.paymentMethod,
          totalSatang: total,
          expectBagReturn: input.expectBagReturn,
          deliveryOtp: String(randomInt(10000)).padStart(4, '0'),
          slotStart: input.slotStart,
          slotEnd: input.slotEnd,
        })
        .returning();
      await tx.insert(orderItems).values(lines.map((l) => ({ ...l, orderId: order.id })));
      await tx.insert(orderEvents).values({ orderId: order.id, toStatus: 'PENDING', actorId: customer.id, actorRole: 'customer' });
      await this.notify.enqueue(tx, customer.id, 'ORDER_PLACED', { code: order.code, total: baht(total), otp: order.deliveryOtp });
      await this.notify.enqueueForRole(tx, 'warehouse', 'NEW_ORDER_FOR_WAREHOUSE', { code: order.code });
      return order;
    });
  }

  /** สั่งซ้ำ 1 คลิก: คัดลอกรายการของออเดอร์ล่าสุด ใช้ราคาปัจจุบัน */
  async reorderLast(customer: User, opts: { expectBagReturn?: number; addressId?: string }) {
    const [last] = await this.db.select().from(orders).where(eq(orders.customerId, customer.id)).orderBy(desc(orders.createdAt)).limit(1);
    if (!last) throw new DomainError(404, 'NO_PREVIOUS_ORDER', 'ยังไม่มีออเดอร์ก่อนหน้า');
    const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, last.id));
    return this.create(customer, {
      addressId: opts.addressId ?? last.addressId,
      items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
      expectBagReturn: opts.expectBagReturn ?? 0,
      paymentMethod: last.paymentMethod,
    });
  }

  cancel(id: string, by: User, reason?: string) {
    return this.withLockedOrder(id, async (tx, o) => {
      if (by.role === 'customer' && o.customerId !== by.id) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบออเดอร์');
      const updated = await this.transition(tx, o, 'CANCELLED', actorOf(by), { note: reason });
      await this.notify.enqueue(tx, o.customerId, 'ORDER_CANCELLED', { code: o.code });
      return updated;
    });
  }

  // ---------------------------------------------------------------- คลัง (ขั้น 2–3)

  confirm(id: string, by: User) {
    return this.withLockedOrder(id, async (tx, o) => {
      const updated = await this.transition(tx, o, 'CONFIRMED', actorOf(by));
      await this.notify.enqueue(tx, o.customerId, 'ORDER_CONFIRMED', { code: o.code });
      return updated;
    });
  }

  pack(id: string, by: User) {
    return this.withLockedOrder(id, (tx, o) => this.transition(tx, o, 'PACKED', actorOf(by)));
  }

  /** มอบหมายไรเดอร์ (ไม่เปลี่ยนสถานะ แต่บันทึกใน order_events) */
  assign(id: string, riderId: string, by: User) {
    return this.withLockedOrder(id, async (tx, o) => {
      if (!['CONFIRMED', 'PACKED'].includes(o.status)) {
        throw new DomainError(409, 'INVALID_TRANSITION', 'มอบหมายไรเดอร์ได้เฉพาะออเดอร์ที่รับแล้วและยังไม่ออกจากคลัง');
      }
      const [rider] = await tx.select().from(users).where(and(eq(users.id, riderId), eq(users.role, 'rider'), eq(users.active, true)));
      if (!rider) throw new DomainError(404, 'RIDER_NOT_FOUND', 'ไม่พบไรเดอร์');
      const [updated] = await tx.update(orders).set({ riderId, updatedAt: new Date() }).where(eq(orders.id, o.id)).returning();
      await tx.insert(orderEvents).values({
        orderId: o.id, fromStatus: o.status, toStatus: o.status, actorId: by.id, actorRole: by.role,
        note: 'assign_rider', data: { riderId, previousRiderId: o.riderId },
      });
      await this.notify.enqueue(tx, riderId, 'JOB_ASSIGNED', { code: o.code });
      return updated;
    });
  }

  // ---------------------------------------------------------------- ไรเดอร์ (ขั้น 4–7)

  pickUp(id: string, by: User, evidence: Evidence) {
    return this.withLockedOrder(id, (tx, o) => this.transition(tx, o, 'PICKED_UP', actorOf(by), { evidence }));
  }

  startDelivery(id: string, by: User) {
    return this.withLockedOrder(id, async (tx, o) => {
      const updated = await this.transition(tx, o, 'OUT_FOR_DELIVERY', actorOf(by));
      await this.notify.enqueue(tx, o.customerId, 'OUT_FOR_DELIVERY', { code: o.code });
      return updated;
    });
  }

  /**
   * ขั้น 6 (+ ขั้น 7 ถ้ามีถุงคืน) ด้วยการกดครั้งเดียวตาม mockup หน้าไรเดอร์
   * - ส่งสำเร็จ: ออกถุงเข้าบัญชีลูกค้าตามสินค้าที่มีถุง, เงินสดถือว่าเก็บแล้ว
   * - bagsCollected > 0: บันทึกรับถุงคืน → BAG_COLLECTED
   * - bagsCollected = 0: ปิดงานอัตโนมัติ → CLOSED
   */
  async deliver(id: string, by: User, input: { evidence: Evidence; otp?: string; bagsCollected: number; bagPhotoUrl?: string }) {
    type DeliverResult =
      | { ok: false; otpError: 'OTP_LOCKED' | 'OTP_MISMATCH'; nextAttempts: number }
      | { ok: true; order: Order };

    const res = await this.withLockedOrder<DeliverResult>(id, async (tx, o) => {
      if (o.otpLocked) {
        throw new DomainError(422, 'OTP_LOCKED', 'ออเดอร์นี้ถูกล็อกเนื่องจากกรอก OTP ผิดเกิน 5 ครั้ง กรุณาติดต่อแอดมิน');
      }

      if (this.cfg.REQUIRE_DELIVERY_OTP && !otpMatches(o.deliveryOtp, input.otp)) {
        const nextAttempts = (o.otpAttempts ?? 0) + 1;
        const isLocked = nextAttempts >= 5;
        await tx.update(orders).set({ otpAttempts: nextAttempts, otpLocked: isLocked }).where(eq(orders.id, o.id));
        return { ok: false, otpError: isLocked ? 'OTP_LOCKED' : 'OTP_MISMATCH', nextAttempts };
      }

      if (o.otpAttempts > 0) {
        await tx.update(orders).set({ otpAttempts: 0 }).where(eq(orders.id, o.id));
      }

      let cur = await this.transition(tx, o, 'DELIVERED', actorOf(by), { evidence: input.evidence });

      const [{ returnable }] = await tx
        .select({ returnable: sql<number>`coalesce(sum(${orderItems.qty}) filter (where ${orderItems.isReturnable}), 0)::int` })
        .from(orderItems)
        .where(eq(orderItems.orderId, o.id));
      await this.bags.issue(tx, { customerId: o.customerId, orderId: o.id, qty: returnable, by: by.id });

      if (o.paymentMethod === 'CASH') {
        await tx.insert(payments).values({ orderId: o.id, method: 'CASH', amountSatang: o.totalSatang, verified: true, ref: `rider:${by.id}` });
        cur = (await tx.update(orders).set({ paymentStatus: 'PAID' }).where(eq(orders.id, o.id)).returning())[0];
      }

      if (input.bagsCollected > 0) {
        await this.bags.collect(tx, { customerId: o.customerId, orderId: o.id, qty: input.bagsCollected, by: by.id });
        cur = await this.transition(tx, cur, 'BAG_COLLECTED', actorOf(by), {
          evidence: { ...input.evidence, photoUrl: input.bagPhotoUrl },
          data: { qty: input.bagsCollected, expected: o.expectBagReturn },
        });
      } else {
        cur = await this.transition(tx, cur, 'CLOSED', SYSTEM, { note: 'no_bag_return' });
      }

      const bagBalance = await this.bags.balance(o.customerId, tx);
      await this.notify.enqueue(tx, o.customerId, 'DELIVERED', { code: o.code, bagBalance });
      if (input.bagsCollected > 0) {
        await this.notify.enqueue(tx, o.customerId, 'BAGS_COLLECTED', { qty: input.bagsCollected, bagBalance });
      }
      return { ok: true, order: cur };
    });

    if (!res.ok) {
      if (res.otpError === 'OTP_LOCKED') {
        throw new DomainError(422, 'OTP_LOCKED', 'กรอก OTP ผิดครบ 5 ครั้ง ออเดอร์นี้ถูกล็อก กรุณาติดต่อแอดมินเพื่อปลดล็อก');
      }
      throw new DomainError(422, 'OTP_MISMATCH', `รหัสยืนยันจากลูกค้าไม่ถูกต้อง (เหลือโอกาสอีก ${5 - res.nextAttempts} ครั้ง)`);
    }

    return res.order;
  }

  failDelivery(id: string, by: User, input: { evidence: Evidence; reason: string }) {
    return this.withLockedOrder(id, async (tx, o) => {
      const updated = await this.transition(tx, o, 'FAILED_DELIVERY', actorOf(by), { evidence: input.evidence, note: input.reason });
      await this.notify.enqueue(tx, o.customerId, 'DELIVERY_FAILED', { code: o.code, reason: input.reason });
      return updated;
    });
  }

  /** แอดมินนัดส่งใหม่หลังส่งไม่สำเร็จ: กลับไป CONFIRMED และล้างไรเดอร์ */
  reschedule(id: string, by: User, note?: string) {
    return this.withLockedOrder(id, async (tx, o) => {
      const updated = await this.transition(tx, o, 'CONFIRMED', actorOf(by), { note: note ?? 'reschedule' });
      return (await tx.update(orders).set({ riderId: null }).where(eq(orders.id, updated.id)).returning())[0];
    });
  }

  // ---------------------------------------------------------------- คลังรับถุง (ขั้น 8)

  receiveBags(id: string, by: User, input: { evidence: Evidence; counted: number }) {
    return this.withLockedOrder(id, async (tx, o) => {
      let cur = await this.transition(tx, o, 'BAG_RETURNED', actorOf(by), { evidence: input.evidence, data: { counted: input.counted } });
      const { match, collected } = await this.bags.receive(tx, { customerId: o.customerId, orderId: o.id, counted: input.counted, by: by.id });
      if (match) {
        cur = await this.transition(tx, cur, 'CLOSED_WITH_RETURN', SYSTEM, { note: 'bag_count_matched' });
      } else {
        cur = (await tx.update(orders).set({ bagMismatch: true }).where(eq(orders.id, o.id)).returning())[0];
        await this.notify.enqueueForRole(tx, 'admin', 'BAG_MISMATCH', { code: o.code, collected, counted: input.counted });
      }
      return cur;
    });
  }

  /** แอดมินเคลียร์ยอดถุงไม่ตรงแล้วปิดงาน (บันทึกเหตุผลใน order_events) */
  resolveBagMismatch(id: string, by: User, note: string) {
    return this.withLockedOrder(id, async (tx, o) => {
      if (!o.bagMismatch) throw new DomainError(409, 'NO_MISMATCH', 'ออเดอร์นี้ไม่มียอดถุงไม่ตรง');
      const cur = await this.transition(tx, o, 'CLOSED_WITH_RETURN', actorOf(by), { note });
      return (await tx.update(orders).set({ bagMismatch: false }).where(eq(orders.id, cur.id)).returning())[0];
    });
  }

  /** แอดมินปลดล็อก OTP หลังกรอกผิดเกิน 5 ครั้ง */
  unlockOtp(id: string, by: User) {
    return this.withLockedOrder(id, async (tx, o) => {
      if (by.role !== 'admin') throw new DomainError(403, 'FORBIDDEN_ROLE', 'เฉพาะแอดมินเท่านั้นที่ปลดล็อก OTP ได้');
      await tx.update(orders).set({ otpAttempts: 0, otpLocked: false }).where(eq(orders.id, o.id));
      return { ok: true, message: 'ปลดล็อก OTP เรียบร้อย' };
    });
  }

  // ---------------------------------------------------------------- การชำระเงิน PromptPay

  submitSlip(id: string, customer: User, input: { slipUrl: string; ref?: string }) {
    return this.withLockedOrder(id, async (tx, o) => {
      if (o.customerId !== customer.id) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบออเดอร์');
      if (o.paymentMethod !== 'PROMPTPAY' || o.paymentStatus === 'PAID') {
        throw new DomainError(409, 'PAYMENT_NOT_EXPECTED', 'ออเดอร์นี้ไม่ต้องแนบสลิป');
      }
      await tx.insert(payments).values({ orderId: o.id, method: 'PROMPTPAY', amountSatang: o.totalSatang, slipUrl: input.slipUrl, ref: input.ref });
      return (await tx.update(orders).set({ paymentStatus: 'PENDING_VERIFY' }).where(eq(orders.id, o.id)).returning())[0];
    });
  }

  verifyPayment(id: string, by: User) {
    return this.withLockedOrder(id, async (tx, o) => {
      if (o.paymentStatus !== 'PENDING_VERIFY') throw new DomainError(409, 'NOTHING_TO_VERIFY', 'ไม่มีสลิปรอตรวจ');
      await tx.update(payments).set({ verified: true }).where(and(eq(payments.orderId, o.id), eq(payments.method, 'PROMPTPAY')));
      await tx.insert(orderEvents).values({ orderId: o.id, fromStatus: o.status, toStatus: o.status, actorId: by.id, actorRole: by.role, note: 'payment_verified' });
      return (await tx.update(orders).set({ paymentStatus: 'PAID' }).where(eq(orders.id, o.id)).returning())[0];
    });
  }

  // ---------------------------------------------------------------- อ่านข้อมูล

  /** ลูกค้าเห็นเฉพาะของตัวเอง ไรเดอร์เห็นเฉพาะงานที่ได้รับ พนักงานคลังและแอดมินเห็นทั้งหมด */
  async getVisible(id: string, viewer: User) {
    const [o] = await this.db.select().from(orders).where(eq(orders.id, id));
    const visible =
      o &&
      (viewer.role === 'admin' ||
        viewer.role === 'warehouse' ||
        (viewer.role === 'customer' && o.customerId === viewer.id) ||
        (viewer.role === 'rider' && o.riderId === viewer.id));
    if (!visible) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบออเดอร์');
    const items = await this.db
      .select({ productId: orderItems.productId, name: products.name, qty: orderItems.qty, priceSatang: orderItems.priceSatang, isReturnable: orderItems.isReturnable })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(eq(orderItems.orderId, id));
    const [address] = await this.db.select().from(addresses).where(eq(addresses.id, o.addressId));
    // OTP ให้ลูกค้าเห็นเท่านั้น
    const { deliveryOtp, ...rest } = o;
    return { ...rest, ...(viewer.role === 'customer' ? { deliveryOtp } : {}), items, address };
  }

  events(id: string) {
    return this.db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(asc(orderEvents.id));
  }

  list(filter: { status?: OrderStatus; customerId?: string; limit?: number }) {
    const conds = [];
    if (filter.status) conds.push(eq(orders.status, filter.status));
    if (filter.customerId) conds.push(eq(orders.customerId, filter.customerId));
    return this.db
      .select({ id: orders.id, code: orders.code, status: orders.status, customerId: orders.customerId, riderId: orders.riderId,
        totalSatang: orders.totalSatang, paymentMethod: orders.paymentMethod, paymentStatus: orders.paymentStatus,
        expectBagReturn: orders.expectBagReturn, bagMismatch: orders.bagMismatch, createdAt: orders.createdAt })
      .from(orders)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(Math.min(filter.limit ?? 50, 200));
  }

  /** งานของไรเดอร์ที่ยังไม่จบ (ตามหน้า "งานวันนี้") */
  riderJobs(riderId: string) {
    return this.db
      .select({ id: orders.id, code: orders.code, status: orders.status, expectBagReturn: orders.expectBagReturn,
        paymentMethod: orders.paymentMethod, paymentStatus: orders.paymentStatus, totalSatang: orders.totalSatang,
        customerName: users.name, customerPhone: users.phone,
        address: { label: addresses.label, detail: addresses.detail, lat: addresses.lat, lng: addresses.lng, note: addresses.note } })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.customerId))
      .innerJoin(addresses, eq(addresses.id, orders.addressId))
      .where(and(eq(orders.riderId, riderId), inArray(orders.status, ['CONFIRMED', 'PACKED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'])))
      .orderBy(asc(orders.slotStart), asc(orders.createdAt));
  }

  bagMismatches() {
    return this.db.select().from(orders).where(eq(orders.bagMismatch, true)).orderBy(desc(orders.updatedAt));
  }

  listRiders() {
    return this.db
      .select({ id: users.id, name: users.name, vehicle: users.vehicle, zone: users.zone })
      .from(users)
      .where(and(eq(users.role, 'rider'), eq(users.active, true)))
      .orderBy(asc(users.name));
  }
}

function otpMatches(expected: string, given?: string) {
  if (!given || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}
