import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { loadConfig } from '../src/config';
import { runMigrations } from '../src/db/migrate';
import { seed } from '../src/db/seed';
import { NotificationsService } from '../src/notifications/notifications.service';

/**
 * ทดสอบครบ Flow 8 ขั้นกับฐานข้อมูลจริง (ล้างฐานข้อมูลทดสอบทุกครั้งที่รัน)
 * ต้องมี PostgreSQL: docker compose up -d db
 */
const URL = process.env.TEST_DATABASE_URL ?? 'postgres://drinkgo:drinkgo@localhost:5433/drinkgo_test';
process.env.PUBLIC_UPLOAD_BASE_URL = 'https://files.example';
const EV = { photoUrl: 'https://files.example/pod.jpg', lat: 13.75, lng: 100.5 };

let app: INestApplication;
let server: Parameters<typeof request>[0];
const as = (lineUserId: string) => ({
  get: (p: string) => request(server).get(p).set('x-dev-user', lineUserId),
  post: (p: string, body: object = {}) => request(server).post(p).set('x-dev-user', lineUserId).send(body),
});
const admin = as('dev-admin');
const wh = as('dev-warehouse');
const rider = as('dev-rider');
const rider2 = as('dev-rider-2');

async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: URL });
  await c.connect();
  try {
    return (await c.query(text, params)).rows as T[];
  } finally {
    await c.end();
  }
}

beforeAll(async () => {
  await sql('drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;');
  await runMigrations(URL);
  await seed(URL);
  const cfg = loadConfig({
    DATABASE_URL: URL, AUTH_MODE: 'dev', NOTIFY_DISPATCH_INTERVAL_MS: '0', LINE_CHANNEL_SECRET: 'test-secret',
  } as unknown as NodeJS.ProcessEnv);
  const mod = await Test.createTestingModule({ imports: [AppModule.forRoot(cfg)] }).compile();
  app = mod.createNestApplication({ rawBody: true, logger: false });
  await app.init();
  server = app.getHttpServer();
});
afterAll(async () => app?.close());

async function registerCustomer(lineUserId: string) {
  const c = as(lineUserId);
  await c.post('/me/register', { name: 'สมใจ', phone: '0812345678', pdpaConsent: true }).expect(201);
  const addr = await c.post('/me/addresses', { label: 'บ้าน', detail: '[ที่อยู่ทดสอบ]', lat: 13.75, lng: 100.5 }).expect(201);
  return { c, addressId: addr.body.id as string };
}
const userId = async (lineUserId: string) => (await as(lineUserId).get('/me').expect(200)).body.id as string;
const otpOf = async (c: ReturnType<typeof as>, orderId: string) => (await c.get(`/orders/${orderId}`).expect(200)).body.deliveryOtp as string;

/** พาออเดอร์ไปถึง OUT_FOR_DELIVERY (ขั้น 2–5) */
async function toOutForDelivery(orderId: string) {
  await wh.post(`/orders/${orderId}/confirm`).expect(200);
  await wh.post(`/orders/${orderId}/pack`).expect(200);
  await wh.post(`/orders/${orderId}/assign`, { riderId: await userId('dev-rider') }).expect(200);
  await rider.post(`/orders/${orderId}/pickup`, { evidence: EV }).expect(200);
  await rider.post(`/orders/${orderId}/start`).expect(200);
}

describe('ลงทะเบียนและสิทธิ์', () => {
  it('ผู้ใช้ LINE ที่ยังไม่ลงทะเบียนใช้งานไม่ได้', async () => {
    const res = await as('stranger').get('/me/addresses');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NOT_REGISTERED');
  });
  it('ต้องยอมรับ PDPA', async () => {
    await as('no-consent').post('/me/register', { name: 'ก', phone: '0812345678', pdpaConsent: false }).expect(400);
  });
  it('ไม่ส่งตัวตนเลย = 401', async () => {
    await request(server).get('/me').expect(401);
  });
});

describe('Flow เต็ม: มีถุงคืน (ขั้น 1–8)', () => {
  it('รอบแรกได้ถุง 3 ใบ รอบสองคืน 2 ใบ คลังนับตรง → CLOSED_WITH_RETURN', async () => {
    const { c, addressId } = await registerCustomer('cust-a');

    // ยังไม่มีถุงค้าง แจ้งคืนไม่ได้
    const bad = await c.post('/orders', { addressId, items: [{ productId: 1, qty: 3 }], expectBagReturn: 1, paymentMethod: 'CASH' });
    expect(bad.status).toBe(422);
    expect(bad.body.code).toBe('BAGS_EXCEED_BALANCE');

    const o1 = (await c.post('/orders', { addressId, items: [{ productId: 1, qty: 3 }], paymentMethod: 'CASH' }).expect(201)).body;
    expect(o1.status).toBe('PENDING');
    expect(o1.totalSatang).toBe(18000);
    await toOutForDelivery(o1.id);
    const d1 = await rider.post(`/orders/${o1.id}/deliver`, { evidence: EV, otp: await otpOf(c, o1.id) }).expect(200);
    expect(d1.body.status).toBe('CLOSED');
    expect(d1.body.paymentStatus).toBe('PAID');
    expect((await c.get('/me/bags')).body.balance).toBe(3);

    // สั่งซ้ำ 1 คลิก + แจ้งคืน 2 ใบ
    const o2 = (await c.post('/orders/reorder', { expectBagReturn: 2 }).expect(201)).body;
    expect(o2.expectBagReturn).toBe(2);
    await toOutForDelivery(o2.id);
    const otp2 = await otpOf(c, o2.id);

    // ไม่ถ่ายรูปถุง → ปฏิเสธ และ rollback ทั้งก้อน (สถานะ/บัญชีถุงไม่เปลี่ยน)
    const noBagPhoto = await rider.post(`/orders/${o2.id}/deliver`, { evidence: EV, otp: otp2, bagsCollected: 2 });
    expect(noBagPhoto.status).toBe(422);
    expect(noBagPhoto.body.code).toBe('EVIDENCE_REQUIRED');
    expect((await c.get(`/orders/${o2.id}`)).body.status).toBe('OUT_FOR_DELIVERY');
    expect((await c.get('/me/bags')).body.balance).toBe(3);

    const d2 = await rider
      .post(`/orders/${o2.id}/deliver`, { evidence: EV, otp: otp2, bagsCollected: 2, bagPhotoUrl: 'https://files.example/bags.jpg' })
      .expect(200);
    expect(d2.body.status).toBe('BAG_COLLECTED');
    expect((await c.get('/me/bags')).body.balance).toBe(3 + 3 - 2);

    const r = await wh.post(`/orders/${o2.id}/receive-bags`, { evidence: { photoUrl: EV.photoUrl }, counted: 2 }).expect(200);
    expect(r.body.status).toBe('CLOSED_WITH_RETURN');
    expect(r.body.bagMismatch).toBe(false);

    // audit trail ครบทุกขั้น (PACKED สองครั้ง = event มอบหมายไรเดอร์)
    const events = (await admin.get(`/orders/${o2.id}/events`).expect(200)).body.map((e: { toStatus: string }) => e.toStatus);
    expect(events).toEqual([
      'PENDING', 'CONFIRMED', 'PACKED', 'PACKED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'BAG_COLLECTED', 'BAG_RETURNED', 'CLOSED_WITH_RETURN',
    ]);
  });
});

describe('กฎที่ระบบต้องบังคับ', () => {
  let c: ReturnType<typeof as>;
  let addressId: string;
  beforeAll(async () => {
    ({ c, addressId } = await registerCustomer('cust-b'));
  });
  const newOrder = async (qty = 2) =>
    (await c.post('/orders', { addressId, items: [{ productId: 1, qty }], paymentMethod: 'PROMPTPAY' }).expect(201)).body;

  it('ลูกค้ายืนยันออเดอร์เองไม่ได้ และข้ามขั้นไม่ได้', async () => {
    const o = await newOrder();
    await c.post(`/orders/${o.id}/confirm`).expect(403);
    await wh.post(`/orders/${o.id}/confirm`).expect(200);
    const skip = await wh.post(`/orders/${o.id}/receive-bags`, { evidence: { photoUrl: EV.photoUrl }, counted: 0 });
    expect(skip.status).toBe(409);
    expect(skip.body.code).toBe('INVALID_TRANSITION');
  });

  it('ไม่มี GPS ตอนรับสินค้า = 422, ไรเดอร์คนอื่นรับแทนไม่ได้, กดซ้ำ = 409', async () => {
    const o = await newOrder();
    await wh.post(`/orders/${o.id}/confirm`).expect(200);
    await wh.post(`/orders/${o.id}/pack`).expect(200);
    await wh.post(`/orders/${o.id}/assign`, { riderId: await userId('dev-rider') }).expect(200);
    expect((await rider.post(`/orders/${o.id}/pickup`, { evidence: { photoUrl: EV.photoUrl } })).body.code).toBe('EVIDENCE_REQUIRED');
    expect((await rider2.post(`/orders/${o.id}/pickup`, { evidence: EV })).body.code).toBe('NOT_ASSIGNED_RIDER');
    await rider.post(`/orders/${o.id}/pickup`, { evidence: EV }).expect(200);
    expect((await rider.post(`/orders/${o.id}/pickup`, { evidence: EV })).status).toBe(409);
  });

  it('รหัสยืนยันผิด = ส่งสำเร็จไม่ได้', async () => {
    const o = await newOrder();
    await toOutForDelivery(o.id);
    const real = await otpOf(c, o.id);
    const res = await rider.post(`/orders/${o.id}/deliver`, { evidence: EV, otp: real === '0000' ? '1111' : '0000' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('OTP_MISMATCH');
  });

  it('PromptPay: แนบสลิป → แอดมินตรวจ → PAID', async () => {
    const o = await newOrder(1);
    await c.post(`/orders/${o.id}/payment-slip`, { slipUrl: 'https://files.example/slip.jpg', ref: 'REF1' }).expect(200);
    const v = await admin.post(`/orders/${o.id}/verify-payment`).expect(200);
    expect(v.body.paymentStatus).toBe('PAID');
  });

  it('ลูกค้าอื่นมองไม่เห็นออเดอร์ และไรเดอร์ไม่เห็น OTP', async () => {
    const o = await newOrder(1);
    await as('cust-a').get(`/orders/${o.id}`).expect(404);
    await toOutForDelivery(o.id);
    const seen = (await rider.get(`/orders/${o.id}`).expect(200)).body;
    expect(seen.deliveryOtp).toBeUndefined();
    const jobs = (await rider.get('/rider/jobs').expect(200)).body;
    expect(jobs.some((j: { id: string }) => j.id === o.id)).toBe(true);
  });

  it('ขั้นที่ 3 พนักงานขนส่งกดน้ำ: มอบหมายงานตอน CONFIRMED → โผล่ใน /rider/jobs → ไรเดอร์คนอื่นกดไม่ได้ → เจ้าของงานกด pack ได้', async () => {
    const o = await newOrder(1);
    const ridersList = (await wh.get('/riders').expect(200)).body;
    expect(ridersList.length).toBeGreaterThanOrEqual(2);
    await wh.post(`/orders/${o.id}/confirm`).expect(200);
    await wh.post(`/orders/${o.id}/assign`, { riderId: await userId('dev-rider') }).expect(200);

    // งานสถานะ CONFIRMED ที่ได้รับมอบหมายต้องโผล่ใน /rider/jobs ของไรเดอร์คนนั้น
    const jobs = (await rider.get('/rider/jobs').expect(200)).body;
    expect(jobs.some((j: { id: string; status: string }) => j.id === o.id && j.status === 'CONFIRMED')).toBe(true);

    // ไรเดอร์คนอื่นกด pack แทนไม่ได้
    const forbidden = await rider2.post(`/orders/${o.id}/pack`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('NOT_ASSIGNED_RIDER');

    // ไรเดอร์เจ้าของงานกดน้ำ (pack) สำเร็จ
    const packed = await rider.post(`/orders/${o.id}/pack`).expect(200);
    expect(packed.body.status).toBe('PACKED');
  });

  it('ส่งไม่สำเร็จ → แอดมินนัดส่งใหม่ (ล้างไรเดอร์)', async () => {
    const o = await newOrder(1);
    await toOutForDelivery(o.id);
    await rider.post(`/orders/${o.id}/fail`, { evidence: EV, reason: 'ลูกค้าไม่อยู่' }).expect(200);
    const r = await admin.post(`/orders/${o.id}/reschedule`, { note: 'นัดพรุ่งนี้' }).expect(200);
    expect(r.body.status).toBe('CONFIRMED');
    expect(r.body.riderId).toBeNull();
  });
});

describe('ยอดถุงไม่ตรง (FR-A04) และการตัดยอด', () => {
  it('ไรเดอร์รับ 2 คลังนับได้ 1 → ค้าง BAG_RETURNED + แจ้งแอดมิน → แอดมินเคลียร์ปิดงาน', async () => {
    const { c, addressId } = await registerCustomer('cust-c');
    const first = (await c.post('/orders', { addressId, items: [{ productId: 1, qty: 2 }], paymentMethod: 'CASH' }).expect(201)).body;
    await toOutForDelivery(first.id);
    await rider.post(`/orders/${first.id}/deliver`, { evidence: EV, otp: await otpOf(c, first.id) }).expect(200);

    const o = (await c.post('/orders', { addressId, items: [{ productId: 2, qty: 1 }], paymentMethod: 'CASH', expectBagReturn: 2 }).expect(201)).body;
    await toOutForDelivery(o.id);
    await rider
      .post(`/orders/${o.id}/deliver`, { evidence: EV, otp: await otpOf(c, o.id), bagsCollected: 2, bagPhotoUrl: EV.photoUrl })
      .expect(200);
    const r = await wh.post(`/orders/${o.id}/receive-bags`, { evidence: { photoUrl: EV.photoUrl }, counted: 1 }).expect(200);
    expect(r.body.status).toBe('BAG_RETURNED');
    expect(r.body.bagMismatch).toBe(true);

    const list = (await admin.get('/admin/bag-mismatches').expect(200)).body;
    expect(list.map((x: { id: string }) => x.id)).toContain(o.id);
    const alerts = await sql("select count(*)::int as n from notification_outbox where type = 'BAG_MISMATCH'");
    expect(alerts[0].n).toBeGreaterThan(0);

    const done = await admin.post(`/orders/${o.id}/resolve-bags`, { note: 'ไรเดอร์ทำหาย 1 ใบ' }).expect(200);
    expect(done.body.status).toBe('CLOSED_WITH_RETURN');
    expect(done.body.bagMismatch).toBe(false);
  });

  it('รับถุงคืนเกินยอดค้างไม่ได้ และแอดมินตัดยอดได้ไม่เกินยอดค้าง', async () => {
    const { c, addressId } = await registerCustomer('cust-d');
    const me = (await c.get('/me')).body;
    const o = (await c.post('/orders', { addressId, items: [{ productId: 1, qty: 1 }], paymentMethod: 'CASH' }).expect(201)).body;
    await toOutForDelivery(o.id);
    const otp = await otpOf(c, o.id);
    const res = await rider.post(`/orders/${o.id}/deliver`, { evidence: EV, otp, bagsCollected: 5, bagPhotoUrl: EV.photoUrl });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BAGS_EXCEED_BALANCE');

    await rider.post(`/orders/${o.id}/deliver`, { evidence: EV, otp }).expect(200);
    await admin.post(`/admin/customers/${me.id}/bags/write-off`, { qty: 2, note: 'ทดสอบ' }).expect(422);
    const w = await admin.post(`/admin/customers/${me.id}/bags/write-off`, { qty: 1, note: 'ลูกค้าทำหาย คิดเงินแล้ว' }).expect(201);
    expect(w.body.balance).toBe(0);
  });
});

describe('ความทนทาน', () => {
  it('order_events และ bag_ledger แก้หรือลบไม่ได้ในระดับฐานข้อมูล', async () => {
    await expect(sql('update order_events set note = $1', ['x'])).rejects.toThrow(/append-only/);
    await expect(sql('delete from bag_ledger')).rejects.toThrow(/append-only/);
  });

  it('กดยืนยันพร้อมกัน 2 ครั้ง สำเร็จครั้งเดียว', async () => {
    const { c, addressId } = await registerCustomer('cust-e');
    const o = (await c.post('/orders', { addressId, items: [{ productId: 2, qty: 1 }], paymentMethod: 'CASH' }).expect(201)).body;
    const [a, b] = await Promise.all([wh.post(`/orders/${o.id}/confirm`), wh.post(`/orders/${o.id}/confirm`)]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const confirms = (await admin.get(`/orders/${o.id}/events`)).body.filter((e: { toStatus: string }) => e.toStatus === 'CONFIRMED');
    expect(confirms).toHaveLength(1);
  });

  it('แจ้งเตือนถูกส่งออกจาก outbox ครั้งเดียว', async () => {
    const svc = app.get(NotificationsService);
    expect(await svc.dispatch(1000)).toBeGreaterThan(0);
    expect(await svc.dispatch()).toBe(0);
  });

  it('LINE webhook: ลายเซ็นผิด = 403, ถูก = 200 และกันซ้ำ', async () => {
    const body = JSON.stringify({ events: [{ type: 'follow', webhookEventId: 'evt-1', source: { userId: 'U1' } }] });
    const send = (sig: string) =>
      request(server).post('/line/webhook').set('content-type', 'application/json').set('x-line-signature', sig).send(body);
    await send('bad').expect(403);
    const sig = createHmac('sha256', 'test-secret').update(body).digest('base64');
    await send(sig).expect(200);
    await send(sig).expect(200);
    await new Promise((r) => setTimeout(r, 300));
    const rows = await sql("select count(*)::int as n from line_webhook_events where webhook_event_id = 'evt-1'");
    expect(rows[0].n).toBe(1);
    const me = await as('U1').get('/me').expect(200);
    expect(me.body.role).toBe('customer');
  });
});

describe('DEV_AUTH_KEY', () => {
  let keyed: INestApplication;
  const KEY = 'k'.repeat(32);
  beforeAll(async () => {
    const cfg = loadConfig(({ DATABASE_URL: URL, AUTH_MODE: 'dev', DEV_AUTH_KEY: KEY, NOTIFY_DISPATCH_INTERVAL_MS: '0' }) as unknown as NodeJS.ProcessEnv);
    const mod = await Test.createTestingModule({ imports: [AppModule.forRoot(cfg)] }).compile();
    keyed = mod.createNestApplication({ logger: false });
    await keyed.init();
  });
  afterAll(async () => keyed?.close());

  it('ไม่มีหรือผิด = 401, ถูก = ผ่าน', async () => {
    await request(keyed.getHttpServer()).get('/me').set('x-dev-user', 'dev-admin').expect(401);
    await request(keyed.getHttpServer()).get('/me').set('x-dev-user', 'dev-admin').set('x-dev-key', 'wrong').expect(401);
    await request(keyed.getHttpServer()).get('/me').set('x-dev-user', 'dev-admin').set('x-dev-key', KEY).expect(200);
  });
});
