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
  post: (p: string, body: object = {}) => request(server).post(p).set('x-dev-user', lineUserId).send(body),
});

const admin = as('dev-admin');
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
    CORS_ORIGINS: 'http://localhost:5173,https://liff.line.me',
    PUBLIC_UPLOAD_BASE_URL: 'https://files.example',
  } as unknown as NodeJS.ProcessEnv);

  const mod = await Test.createTestingModule({ imports: [AppModule.forRoot(cfg)] }).compile();
  app = mod.createNestApplication({ rawBody: true, logger: false });

  // Enable CORS as configured in main.ts
  const origins = cfg.CORS_ORIGINS.split(',').map((s) => s.trim());
  app.enableCors({
    origin: origins,
    credentials: true,
  });

  await app.init();
  server = app.getHttpServer();
});

afterAll(async () => app?.close());

describe('Security, CORS & OTP Lockout (B3)', () => {
  const EV = { photoUrl: 'https://files.example/pod.jpg', lat: 13.75, lng: 100.5 };
  let seq = 0;

  async function createOrderAtOutForDelivery() {
    const cust = as(`cust-sec-${++seq}`);
    await cust.post('/me/register', { name: 'สมใจ', phone: '0812345678', pdpaConsent: true }).expect(201);
    const addr = await cust.post('/me/addresses', { label: 'บ้าน', detail: 'กทม', lat: 13.75, lng: 100.5 }).expect(201);
    const o = await cust.post('/orders', { addressId: addr.body.id, items: [{ productId: 1, qty: 1 }], paymentMethod: 'CASH' }).expect(201);
    const orderId = o.body.id as string;

    await wh.post(`/orders/${orderId}/confirm`).expect(200);
    await wh.post(`/orders/${orderId}/pack`).expect(200);
    await wh.post(`/orders/${orderId}/assign`, { riderId: await userId('dev-rider') }).expect(200);
    await rider.post(`/orders/${orderId}/pickup`, { evidence: EV }).expect(200);
    await rider.post(`/orders/${orderId}/start`).expect(200);

    return { cust, orderId };
  }

  it('CORS: ตอบกลับ Header อนุญาตสำหรับ Origin ที่กำหนด', async () => {
    const res = await request(server)
      .options('/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('OTP Lockout: กรอก OTP ผิดครบ 5 ครั้งจะถูกล็อก (422 OTP_LOCKED) และแอดมินปลดล็อกได้', async () => {
    const { cust, orderId } = await createOrderAtOutForDelivery();
    const correctOtp = await otpOf(cust, orderId);
    const wrongOtp = correctOtp === '0000' ? '9999' : '0000';

    // กรอกผิด 4 ครั้งแรก -> 422 OTP_MISMATCH
    for (let i = 1; i <= 4; i++) {
      const res = await rider
        .post(`/orders/${orderId}/deliver`, { evidence: EV, otp: wrongOtp })
        .expect(422);
      expect(res.body.code).toBe('OTP_MISMATCH');
    }

    // ครั้งที่ 5 -> โดนล็อก 422 OTP_LOCKED
    const lockedRes = await rider
      .post(`/orders/${orderId}/deliver`, { evidence: EV, otp: wrongOtp })
      .expect(422);
    expect(lockedRes.body.code).toBe('OTP_LOCKED');

    // ครั้งที่ 6 แม้จะใส่ OTP ที่ถูกต้อง ก็ยังต้องถูกปฏิเสธเพราะออเดอร์ล็อกอยู่
    const stillLocked = await rider
      .post(`/orders/${orderId}/deliver`, { evidence: EV, otp: correctOtp })
      .expect(422);
    expect(stillLocked.body.code).toBe('OTP_LOCKED');

    // ตรวจสอบว่าผู้ที่ไม่ใช่แอดมินไม่สามารถปลดล็อกได้ (403)
    await rider.post(`/orders/${orderId}/unlock-otp`).expect(403);

    // แอดมินทำการปลดล็อกออเดอร์
    await admin.post(`/orders/${orderId}/unlock-otp`).expect(200);

    // หลังแอดมินปลดล็อก ไรเดอร์ส่ง OTP ที่ถูกต้องอีกครั้ง -> สำเร็จ 200 (ไม่มีถุงคืนจึงปิดงานเป็น CLOSED)
    const successRes = await rider
      .post(`/orders/${orderId}/deliver`, { evidence: EV, otp: correctOtp })
      .expect(200);
    expect(successRes.body.status).toBe('CLOSED');
  });
});
