import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { loadConfig } from '../src/config';
import { runMigrations } from '../src/db/migrate';
import { seed } from '../src/db/seed';

const URL = process.env.TEST_DATABASE_URL ?? 'postgres://drinkgo:drinkgo@localhost:5433/drinkgo_test';
const LINE_SECRET = 'line-status-e2e-secret';
const LIFF_ID = '2012276679-cVW55jug';
let app: INestApplication;
let server: Parameters<typeof request>[0];
let pool: Pool;
let seq = 1;

const as = (u: string) => ({
  get: (p: string) => request(server).get(p).set('x-dev-user', u),
  post: (p: string, b?: object) => request(server).post(p).set('x-dev-user', u).send(b ?? {}),
});

function sendLinePostback(lineUserId: string, data: string) {
  const payload = JSON.stringify({
    events: [{
      webhookEventId: `ev-status-${Date.now()}-${seq++}`,
      replyToken: 'reply-token-status',
      type: 'postback',
      source: { userId: lineUserId },
      postback: { data },
    }],
  });
  const sig = createHmac('sha256', LINE_SECRET).update(Buffer.from(payload)).digest('base64');
  return request(server).post('/line/webhook').set('Content-Type', 'application/json').set('x-line-signature', sig).send(payload);
}

beforeAll(async () => {
  await runMigrations(URL);
  pool = new Pool({ connectionString: URL });
  await pool.query(
    'TRUNCATE line_cart_sessions, station_bag_ledger, idempotency_keys, notification_outbox, line_webhook_events, payments, bag_ledger, order_events, order_items, orders, addresses, water_stations, products, users RESTART IDENTITY CASCADE',
  );
  await seed(URL);
  const cfg = loadConfig({
    DATABASE_URL: URL,
    AUTH_MODE: 'dev',
    LINE_CHANNEL_SECRET: LINE_SECRET,
    LINE_LIFF_ID: LIFF_ID,
    NOTIFY_DISPATCH_INTERVAL_MS: '0',
  } as unknown as NodeJS.ProcessEnv);
  const mod = await Test.createTestingModule({ imports: [AppModule.forRoot(cfg)] }).compile();
  app = mod.createNestApplication({ logger: false, rawBody: true });
  await app.init();
  server = app.getHttpServer();
});

afterAll(async () => {
  await app?.close();
  await pool?.end();
});

describe('ปุ่มติดตามสถานะบน LINE Rich Menu (action=status) ดึงออเดอร์ของบัญชี LINE ลูกค้า', () => {
  it('ดึงเฉพาะออเดอร์ของ LINE ผู้ใช้นั้น แสดง Active Carousel ก่อนออเดอร์ที่ยกเลิก และซ่อน OTP เมื่อส่งเสร็จ', async () => {
    const custA = 'U_track_cust_A';
    const custB = 'U_track_cust_B';

    // 1. ลูกค้าใหม่กดปุ่มติดตามสถานะ -> ลงทะเบียนอัตโนมัติและแจ้งว่ายังไม่มีออเดอร์
    const emptyRes = await sendLinePostback(custA, 'action=status').expect(200);
    expect(JSON.stringify(emptyRes.body.replies)).toContain('ยังไม่มีประวัติคำสั่งซื้อ');

    const [addrA] = (await as(custA).get('/me/addresses').expect(200)).body;

    // 2. ลูกค้า A สร้าง 3 ออเดอร์: ออเดอร์ 1 (กำลังส่ง), ออเดอร์ 2 (รอไรเดอร์), ออเดอร์ 3 (ใหม่สุดแต่กดยกเลิก)
    const ord1 = (await as(custA).post('/orders', {
      addressId: addrA.id, stationId: 1, items: [{ productId: 1, qty: 2 }], expectBagReturn: 0, paymentMethod: 'CASH', autoConfirm: true,
    }).expect(201)).body;
    const ord2 = (await as(custA).post('/orders', {
      addressId: addrA.id, stationId: 1, items: [{ productId: 1, qty: 1 }], expectBagReturn: 0, paymentMethod: 'CASH', autoConfirm: true,
    }).expect(201)).body;
    const ord3Cancelled = (await as(custA).post('/orders', {
      addressId: addrA.id, stationId: 1, items: [{ productId: 1, qty: 1 }], expectBagReturn: 0, paymentMethod: 'CASH', autoConfirm: true,
    }).expect(201)).body;
    await as(custA).post(`/orders/${ord3Cancelled.id}/cancel`, { note: 'สั่งซ้ำผิด' }).expect(200);

    // 3. ลูกค้า A กดปุ่มติดตามสถานะ -> ต้องเห็น Carousel ของ ord2 และ ord1 (ไม่โดน ord3 ที่ยกเลิกบัง) พร้อม OTP และลิงก์ LIFF
    const detail1 = (await as(custA).get(`/orders/${ord1.id}`).expect(200)).body;
    const detail2 = (await as(custA).get(`/orders/${ord2.id}`).expect(200)).body;
    const activeRes = await sendLinePostback(custA, 'action=status').expect(200);
    const activeJson = JSON.stringify(activeRes.body.replies);
    expect(activeJson).toContain('"type":"carousel"');
    expect(activeJson).toContain(ord1.code);
    expect(activeJson).toContain(ord2.code);
    expect(activeJson).toContain(detail1.deliveryOtp);
    expect(activeJson).toContain(detail2.deliveryOtp);
    expect(activeJson).toContain('รหัส OTP 4 หลัก');
    expect(activeJson).not.toContain(ord3Cancelled.code);
    expect(activeJson).toContain(`https://liff.line.me/${LIFF_ID}?tab=track&orderId=${ord1.id}`);
    expect(activeJson).not.toContain('lineToken=');

    // 4. บัญชี LINE ของลูกค้า B กดปุ่มติดตามสถานะ -> ต้องไม่เห็นออเดอร์หรือ OTP ของลูกค้า A เด็ดขาด
    const custBRes = await sendLinePostback(custB, 'action=status').expect(200);
    const custBJson = JSON.stringify(custBRes.body.replies);
    expect(custBJson).not.toContain(ord1.code);
    expect(custBJson).not.toContain('รหัส OTP 4 หลัก');
    expect(custBJson).toContain('ยังไม่มีประวัติคำสั่งซื้อ');

    // 5. เมื่อออเดอร์ทั้งสองส่งน้ำถึงมือลูกค้าเรียบร้อยแล้ว -> กดติดตามสถานะอีกครั้งต้องแสดงออเดอร์ที่เพิ่งส่งจบและซ่อนกล่องรหัส OTP 4 หลัก
    const ev = { photoUrl: 'http://localhost:3000/uploads/pod.png', lat: 13.7563, lng: 100.5018 };
    for (const [ord, otp] of [[ord1, detail1.deliveryOtp], [ord2, detail2.deliveryOtp]] as const) {
      await as('dev-rider').post(`/orders/${ord.id}/claim`).expect(200);
      await as('dev-rider').post(`/orders/${ord.id}/pack`).expect(200);
      await as('dev-rider').post(`/orders/${ord.id}/pickup`, { evidence: ev }).expect(200);
      await as('dev-rider').post(`/orders/${ord.id}/start`).expect(200);
      await as('dev-rider').post(`/orders/${ord.id}/deliver`, { evidence: ev, otp, bagsCollected: 0 }).expect(200);
    }

    const doneRes = await sendLinePostback(custA, 'action=status').expect(200);
    const doneJson = JSON.stringify(doneRes.body.replies);
    expect(doneJson).toContain(ord2.code);
    expect(doneJson).toContain('ซ่อนรหัส OTP');
    expect(doneJson).not.toContain('รหัส OTP 4 หลัก');
  });
});
