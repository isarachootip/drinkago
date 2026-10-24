import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { loadConfig } from '../src/config';
import { runMigrations } from '../src/db/migrate';
import { seed } from '../src/db/seed';

const URL = process.env.TEST_DATABASE_URL ?? 'postgres://drinkgo:drinkgo@localhost:5433/drinkgo_test';
process.env.PUBLIC_UPLOAD_BASE_URL = 'https://files.example';

let app: INestApplication;
let server: Parameters<typeof request>[0];

const as = (lineUserId: string) => ({
  get: (p: string) => request(server).get(p).set('x-dev-user', lineUserId),
  post: (p: string, body: object = {}, headers: Record<string, string> = {}) => {
    let req = request(server).post(p).set('x-dev-user', lineUserId);
    for (const [k, v] of Object.entries(headers)) {
      req = req.set(k, v);
    }
    return req.send(body);
  },
});

const wh = as('dev-warehouse');
const rider = as('dev-rider');
const userId = async (lineUserId: string) => (await as(lineUserId).get('/me').expect(200)).body.id as string;
const otpOf = async (c: ReturnType<typeof as>, orderId: string) => (await c.get(`/orders/${orderId}`).expect(200)).body.deliveryOtp as string;

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
    DATABASE_URL: URL,
    AUTH_MODE: 'dev',
    NOTIFY_DISPATCH_INTERVAL_MS: '0',
    PUBLIC_UPLOAD_BASE_URL: 'https://files.example',
  } as unknown as NodeJS.ProcessEnv);

  const mod = await Test.createTestingModule({ imports: [AppModule.forRoot(cfg)] }).compile();
  app = mod.createNestApplication({ rawBody: true, logger: false });
  await app.init();
  server = app.getHttpServer();
});

afterAll(async () => app?.close());

describe('Idempotency-Key & Offline Sync (B2)', () => {
  const EV = { photoUrl: 'https://files.example/pod.jpg', lat: 13.75, lng: 100.5 };
  let orderSeq = 0;

  async function createReadyOrder() {
    const cust = as(`cust-idemp-${++orderSeq}`);
    await cust.post('/me/register', { name: 'สมชาย', phone: '0811112222', pdpaConsent: true }).expect(201);
    const addr = await cust.post('/me/addresses', { label: 'บ้าน', detail: 'กทม', lat: 13.75, lng: 100.5 }).expect(201);
    const o = await cust.post('/orders', { addressId: addr.body.id, items: [{ productId: 1, qty: 2 }], paymentMethod: 'CASH' }).expect(201);
    const orderId = o.body.id as string;

    await wh.post(`/orders/${orderId}/confirm`).expect(200);
    await wh.post(`/orders/${orderId}/pack`).expect(200);
    await wh.post(`/orders/${orderId}/assign`, { riderId: await userId('dev-rider') }).expect(200);
    return { cust, orderId };
  }

  it('ส่ง deliver ซ้ำ 2 ครั้งด้วย Idempotency-Key เดียวกัน ได้ 200 ทั้งคู่ และบัญชีถุงมีรายการเดียว', async () => {
    const { cust, orderId } = await createReadyOrder();

    // ไรเดอร์ pickup และ start
    await rider.post(`/orders/${orderId}/pickup`, { evidence: EV }).expect(200);
    await rider.post(`/orders/${orderId}/start`).expect(200);

    const otp = await otpOf(cust, orderId);
    const deliverPayload = {
      evidence: EV,
      otp,
      bagsCollected: 2,
      bagPhotoUrl: 'https://files.example/bags.jpg',
    };

    // ส่ง deliver ครั้งแรกพร้อม Idempotency-Key (ขั้น 6+7 สำเร็จ เป็น BAG_COLLECTED)
    const res1 = await rider
      .post(`/orders/${orderId}/deliver`, deliverPayload, { 'idempotency-key': 'key-deliver-001' })
      .expect(200);
    expect(res1.body.status).toBe('BAG_COLLECTED');

    // ส่ง deliver ครั้งที่ 2 ด้วย Key เดิมและ Body เดิม (จำลองสถานการณ์เน็ตหลุดแล้วแอป sync ซ้ำ)
    const res2 = await rider
      .post(`/orders/${orderId}/deliver`, deliverPayload, { 'idempotency-key': 'key-deliver-001' })
      .expect(200);
    expect(res2.body.status).toBe('BAG_COLLECTED');

    // ตรวจสอบ Invariant 1: บัญชีถุงต้องมีรายการ COLLECTED สำหรับออเดอร์นี้เพียงแถวเดียว
    const bagRows = await sql<{ movement: string; qty: number }>(
      'select movement, qty from bag_ledger where order_id = $1 and movement = $2',
      [orderId, 'COLLECTED'],
    );
    expect(bagRows.length).toBe(1);
    expect(bagRows[0].qty).toBe(-2);

    // ตรวจสอบ Invariant 2: order_events ต้องมี DELIVERED เพียงแถวเดียว
    const eventRows = await sql<{ to_status: string }>(
      'select to_status from order_events where order_id = $1 and to_status = $2',
      [orderId, 'DELIVERED'],
    );
    expect(eventRows.length).toBe(1);
  });

  it('ส่ง Key เดิมแต่ Payload ต่างกัน ต้องถูกปฏิเสธด้วย 422 IDEMPOTENCY_PAYLOAD_MISMATCH', async () => {
    const { cust, orderId } = await createReadyOrder();

    await rider.post(`/orders/${orderId}/pickup`, { evidence: EV }).expect(200);
    await rider.post(`/orders/${orderId}/start`).expect(200);

    const otp = await otpOf(cust, orderId);
    const payloadA = { evidence: EV, otp, bagsCollected: 1, bagPhotoUrl: 'https://files.example/bags.jpg' };
    const payloadB = { evidence: EV, otp, bagsCollected: 3, bagPhotoUrl: 'https://files.example/bags.jpg' };

    // ส่งครั้งแรกด้วย payloadA
    await rider.post(`/orders/${orderId}/deliver`, payloadA, { 'idempotency-key': 'key-mismatch-test' }).expect(200);

    // ส่งซ้ำด้วย Key เดิมแต่เป็น payloadB -> ต้องได้ 422
    const res = await rider
      .post(`/orders/${orderId}/deliver`, payloadB, { 'idempotency-key': 'key-mismatch-test' })
      .expect(422);

    expect(res.body.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH');
  });

  it('ส่ง pickup และ start ซ้ำด้วย Key เดิม ได้ 200 ทั้งคู่ ไม่ขึ้น 409 transition error', async () => {
    const { orderId } = await createReadyOrder();

    // Pickup ซ้ำ 2 ครั้ง
    const p1 = await rider.post(`/orders/${orderId}/pickup`, { evidence: EV }, { 'idempotency-key': 'key-pickup-001' }).expect(200);
    const p2 = await rider.post(`/orders/${orderId}/pickup`, { evidence: EV }, { 'idempotency-key': 'key-pickup-001' }).expect(200);
    expect(p1.body.status).toBe('PICKED_UP');
    expect(p2.body.status).toBe('PICKED_UP');

    // Start ซ้ำ 2 ครั้ง
    const s1 = await rider.post(`/orders/${orderId}/start`, {}, { 'idempotency-key': 'key-start-001' }).expect(200);
    const s2 = await rider.post(`/orders/${orderId}/start`, {}, { 'idempotency-key': 'key-start-001' }).expect(200);
    expect(s1.body.status).toBe('OUT_FOR_DELIVERY');
    expect(s2.body.status).toBe('OUT_FOR_DELIVERY');
  });
});
