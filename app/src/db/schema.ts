import {
  bigserial, boolean, doublePrecision, index, integer, jsonb,
  pgEnum, pgTable, serial, text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core';

/**
 * ตารางหลักตามเอกสารออกแบบ (หัวข้อ Data Model)
 * customers / riders / พนักงาน รวมเป็นตาราง users ตารางเดียว แยกด้วย role
 */
export const roleEnum = pgEnum('user_role', ['customer', 'warehouse', 'rider', 'admin']);

export const orderStatusEnum = pgEnum('order_status', [
  'PENDING', 'CONFIRMED', 'PACKED', 'PICKED_UP', 'OUT_FOR_DELIVERY',
  'DELIVERED', 'FAILED_DELIVERY', 'BAG_COLLECTED', 'BAG_RETURNED',
  'CLOSED', 'CLOSED_WITH_RETURN', 'CANCELLED',
]);

export const paymentMethodEnum = pgEnum('payment_method', ['CASH', 'PROMPTPAY', 'CREDIT']);
export const paymentStatusEnum = pgEnum('payment_status', ['UNPAID', 'PENDING_VERIFY', 'PAID']);
export const bagMovementEnum = pgEnum('bag_movement', ['ISSUED', 'COLLECTED', 'RECEIVED', 'WRITTEN_OFF']);
export const stationBagMovementEnum = pgEnum('station_bag_movement', ['RESTOCK_IN', 'DISPENSED_OUT', 'RETURNED_IN', 'ADJUST']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  lineUserId: text('line_user_id').notNull(),
  username: text('username'),
  passwordHash: text('password_hash'),
  role: roleEnum('role').notNull().default('customer'),
  name: text('name').notNull(),
  phone: text('phone'),
  customerType: text('customer_type').default('individual'), // individual | business
  /** วงเงินเครดิตของสมาชิก (เก็บเป็นสตางค์, ค่าเริ่มต้น 100,000 สตางค์ = 1,000 บาท) */
  creditLimitSatang: integer('credit_limit_satang').notNull().default(100000),
  vehicle: text('vehicle'),
  zone: text('zone'),
  active: boolean('active').notNull().default(true),
  pdpaConsentAt: timestamp('pdpa_consent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('users_line_user_id_uq').on(t.lineUserId), uniqueIndex('users_username_uq').on(t.username)]);

export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  label: text('label').notNull(),
  detail: text('detail').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('addresses_user_idx').on(t.userId)]);

/** ตู้กดน้ำ / จุดเติมน้ำ ที่นำทางไรเดอร์ไปกดน้ำและเก็บสต็อกถุงประจำตู้ */
export const waterStations = pgTable('water_stations', {
  id: serial('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  addressDetail: text('address_detail').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('water_stations_code_uq').on(t.code)]);

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  priceSatang: integer('price_satang').notNull(),
  isReturnable: boolean('is_returnable').notNull().default(false),
  imageUrl: text('image_url'),
  active: boolean('active').notNull().default(true),
}, (t) => [uniqueIndex('products_sku_uq').on(t.sku)]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull(),
  customerId: uuid('customer_id').notNull().references(() => users.id),
  addressId: uuid('address_id').notNull().references(() => addresses.id),
  riderId: uuid('rider_id').references(() => users.id),
  /** ตู้กดน้ำที่ไรเดอร์ต้องเดินทางไปกดน้ำ */
  stationId: integer('station_id').references(() => waterStations.id),
  status: orderStatusEnum('status').notNull().default('PENDING'),
  slotStart: timestamp('slot_start', { withTimezone: true }),
  slotEnd: timestamp('slot_end', { withTimezone: true }),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('UNPAID'),
  totalSatang: integer('total_satang').notNull(),
  expectBagReturn: integer('expect_bag_return').notNull().default(0),
  deliveryOtp: text('delivery_otp').notNull(),
  otpAttempts: integer('otp_attempts').notNull().default(0),
  otpLocked: boolean('otp_locked').notNull().default(false),
  channel: text('channel').notNull().default('own'),
  bagMismatch: boolean('bag_mismatch').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('orders_code_uq').on(t.code),
  index('orders_status_idx').on(t.status),
  index('orders_customer_idx').on(t.customerId),
  index('orders_rider_idx').on(t.riderId),
]);

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  productId: integer('product_id').notNull().references(() => products.id),
  qty: integer('qty').notNull(),
  priceSatang: integer('price_satang').notNull(),
  isReturnable: boolean('is_returnable').notNull(),
}, (t) => [index('order_items_order_idx').on(t.orderId)]);

/** Audit trail: เพิ่มอย่างเดียว ห้ามแก้หรือลบ */
export const orderEvents = pgTable('order_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  fromStatus: orderStatusEnum('from_status'),
  toStatus: orderStatusEnum('to_status').notNull(),
  actorId: uuid('actor_id').references(() => users.id),
  actorRole: text('actor_role').notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  photoUrl: text('photo_url'),
  note: text('note'),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('order_events_order_idx').on(t.orderId)]);

/** บัญชีถุงค้างของสมาชิก: เพิ่มอย่างเดียว ยอดค้าง = SUM(qty) ต่อลูกค้า */
export const bagLedger = pgTable('bag_ledger', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  customerId: uuid('customer_id').notNull().references(() => users.id),
  orderId: uuid('order_id').references(() => orders.id),
  movement: bagMovementEnum('movement').notNull(),
  qty: integer('qty').notNull(),
  counted: integer('counted'),
  confirmedBy: uuid('confirmed_by').notNull().references(() => users.id),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('bag_ledger_customer_idx').on(t.customerId), index('bag_ledger_order_idx').on(t.orderId)]);

/** บัญชีสต็อกถุงประจำตู้กดน้ำ: เพิ่มอย่างเดียว สต็อกคงเหลือ = SUM(qty) ต่อตู้ เชื่อมรับเข้า-จ่ายออกของสมาชิก */
export const stationBagLedger = pgTable('station_bag_ledger', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  stationId: integer('station_id').notNull().references(() => waterStations.id),
  orderId: uuid('order_id').references(() => orders.id),
  customerId: uuid('customer_id').references(() => users.id),
  movement: stationBagMovementEnum('movement').notNull(),
  qty: integer('qty').notNull(),
  actorId: uuid('actor_id').notNull().references(() => users.id),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('station_bag_ledger_station_idx').on(t.stationId), index('station_bag_ledger_customer_idx').on(t.customerId)]);

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  method: paymentMethodEnum('method').notNull(),
  amountSatang: integer('amount_satang').notNull(),
  slipUrl: text('slip_url'),
  ref: text('ref'),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notificationOutbox = pgTable('notification_outbox', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('PENDING'),
  attempts: integer('attempts').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
}, (t) => [index('notification_outbox_status_idx').on(t.status)]);

export const lineWebhookEvents = pgTable('line_webhook_events', {
  webhookEventId: text('webhook_event_id').primaryKey(),
  type: text('type').notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
});
export interface LineCartItem { productId: number; name: string; priceSatang: number; isReturnable: boolean; qty: number }
export interface LineCartTempData { addressId?: string; newAddressDetail?: string; expectBagReturn?: number; pendingOrderId?: string }
export const lineCartSessions = pgTable('line_cart_sessions', {
  lineUserId: text('line_user_id').primaryKey(),
  items: jsonb('items').$type<LineCartItem[]>().notNull().default([]),
  state: text('state'),
  tempData: jsonb('temp_data').$type<LineCartTempData>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const idempotencyKeys = pgTable('idempotency_keys', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  key: text('key').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id),
  endpoint: text('endpoint').notNull(),
  requestHash: text('request_hash').notNull(),
  responseStatus: integer('response_status').notNull(),
  responseBody: jsonb('response_body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('idempotency_keys_user_key_uq').on(t.userId, t.key), index('idempotency_keys_created_idx').on(t.createdAt)]);
