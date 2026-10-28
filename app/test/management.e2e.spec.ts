import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { loadConfig } from '../src/config';
import { runMigrations } from '../src/db/migrate';
import { seed } from '../src/db/seed';

const URL = process.env.TEST_DATABASE_URL ?? 'postgres://drinkgo:drinkgo@localhost:5433/drinkgo_test';
process.env.PUBLIC_UPLOAD_BASE_URL = 'https://files.example';
const EV = { photoUrl: 'https://files.example/pod.jpg', lat: 13.8005, lng: 100.5505 };

let app: INestApplication;
let server: Parameters<typeof request>[0];
let pool: Pool;

const as = (u: string) => ({
  get: (p: string) => request(server).get(p).set('x-dev-user', u),
  post: (p: string, b?: object) => request(server).post(p).set('x-dev-user', u).send(b ?? {}),
  patch: (p: string, b?: object) => request(server).patch(p).set('x-dev-user', u).send(b ?? {}),
});
const admin = as('dev-admin');
const wh = as('dev-warehouse');
const rider = as('dev-rider');

beforeAll(async () => {
  await runMigrations(URL);
  pool = new Pool({ connectionString: URL });
  await pool.query(
    'TRUNCATE station_bag_ledger, idempotency_keys, notification_outbox, line_webhook_events, payments, bag_ledger, order_events, order_items, orders, addresses, water_stations, products, users RESTART IDENTITY CASCADE',
  );
  await seed(URL);
  const cfg = loadConfig({
    DATABASE_URL: URL,
    AUTH_MODE: 'dev',
    LINE_CHANNEL_SECRET: 'test-secret',
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

describe('การจัดการหลังบ้าน: Rider, ตู้กดน้ำ + สต็อกถุงประจำตู้, ลูกค้า + วงเงินเครดิต', () => {
  it('1. จัดการไรเดอร์: แอดมินเพิ่มไรเดอร์ใหม่และแก้ไขทะเบียนรถ/โซนได้', async () => {
    const created = await admin
      .post('/admin/riders', {
        lineUserId: 'U_rider_new_99',
        name: 'สมศักดิ์ นักซิ่ง',
        phone: '0891112222',
        vehicle: 'มอเตอร์ไซค์ ฮอนด้า กก-999',
        zone: 'C',
      })
      .expect(201);
    expect(created.body.role).toBe('rider');
    expect(created.body.zone).toBe('C');

    const updated = await admin
      .patch(`/admin/riders/${created.body.id}`, { vehicle: 'รถกระบะ ตู้ทึบ 11-2233', zone: 'NORTH', active: true })
      .expect(200);
    expect(updated.body.vehicle).toBe('รถกระบะ ตู้ทึบ 11-2233');
    expect(updated.body.zone).toBe('NORTH');

    const list = await admin.get('/admin/riders').expect(200);
    expect(list.body.some((r: { id: string }) => r.id === created.body.id)).toBe(true);
  });

  it('2. ตู้กดน้ำ & สต็อกถุงประจำตู้: เลือกตู้ใกล้บ้านลูกค้าอัตโนมัติ + ตัดสต็อกถุงตอนกดน้ำ + รับคืนถุงเข้าตู้ตอนปิดงาน', async () => {
    // แอดมินสร้างตู้กดน้ำ ST-NORTH ที่พิกัด (13.8000, 100.5500) และเติมถุงเข้าตู้ 20 ใบ
    const stRes = await admin
      .post('/admin/stations', {
        code: 'ST-NORTH',
        name: 'ตู้กดน้ำสาขาจตุจักร',
        addressDetail: 'พหลโยธิน 18 เขตจตุจักร',
        lat: 13.8,
        lng: 100.55,
      })
      .expect(201);
    const stationId: number = stRes.body.id;

    const restock = await admin
      .post(`/admin/stations/${stationId}/bags`, { movement: 'RESTOCK_IN', qty: 20, note: 'เติมถุงรอบเช้า' })
      .expect(201);
    expect(restock.body.bagBalance).toBe(20);

    // สมัครสมาชิกที่บ้านอยู่ใกล้ตู้จตุจักร (13.8005, 100.5505)
    const c = as('cust-north');
    await c.post('/me/register', { name: 'คุณสายเหนือ', phone: '0819998888', pdpaConsent: true }).expect(201);
    const addr = await c
      .post('/me/addresses', { label: 'บ้านจตุจักร', detail: 'ซอยพหลโยธิน 18/1', lat: 13.8005, lng: 100.5505 })
      .expect(201);

    // สั่งน้ำดื่มแบบถัง 3 ถัง -> ระบบต้องผูกกับตู้ ST-NORTH อัตโนมัติเพราะใกล้บ้านที่สุด
    const order = (
      await c.post('/orders', { addressId: addr.body.id, items: [{ productId: 1, qty: 3 }], paymentMethod: 'CASH' }).expect(201)
    ).body;
    expect(order.stationId).toBe(stationId);

    // คลังยืนยัน + มอบหมายไรเดอร์ -> ไรเดอร์กดน้ำ (pack) -> สต็อกถุงของตู้ ST-NORTH ต้องถูกตัดออก 3 ใบ (เหลือ 17 ใบ)
    await wh.post(`/orders/${order.id}/confirm`).expect(200);
    const riders = (await wh.get('/riders').expect(200)).body;
    const devRider = riders.find((r: { name: string }) => r.name === 'ไรเดอร์ทดสอบ');
    await wh.post(`/orders/${order.id}/assign`, { riderId: devRider.id }).expect(200);
    await rider.post(`/orders/${order.id}/pack`).expect(200);

    const stationsAfterPack = (await admin.get('/stations').expect(200)).body;
    const stAfterPack = stationsAfterPack.find((s: { id: number }) => s.id === stationId);
    expect(stAfterPack.bagBalance).toBe(17);

    // ส่งสำเร็จพร้อมรับถุงคืนในออเดอร์ถัดไป แล้วคลังนับถุงคืน -> สต็อกถุงของตู้ต้องบวกกลับ
    await rider.post(`/orders/${order.id}/pickup`, { evidence: EV }).expect(200);
    await rider.post(`/orders/${order.id}/start`).expect(200);
    const otp1 = (await c.get(`/orders/${order.id}`)).body.deliveryOtp;
    await rider.post(`/orders/${order.id}/deliver`, { evidence: EV, otp: otp1 }).expect(200);

    // ออเดอร์รอบ 2 คืนถุง 2 ใบ
    const order2 = (
      await c
        .post('/orders', { addressId: addr.body.id, items: [{ productId: 1, qty: 1 }], paymentMethod: 'CASH', expectBagReturn: 2 })
        .expect(201)
    ).body;
    await wh.post(`/orders/${order2.id}/confirm`).expect(200);
    await wh.post(`/orders/${order2.id}/assign`, { riderId: devRider.id }).expect(200);
    await rider.post(`/orders/${order2.id}/pack`).expect(200); // ตัดออกอีก 1 ใบ เหลือ 16
    await rider.post(`/orders/${order2.id}/pickup`, { evidence: EV }).expect(200);
    await rider.post(`/orders/${order2.id}/start`).expect(200);
    const otp2 = (await c.get(`/orders/${order2.id}`)).body.deliveryOtp;
    await rider
      .post(`/orders/${order2.id}/deliver`, { evidence: EV, otp: otp2, bagsCollected: 2, bagPhotoUrl: EV.photoUrl })
      .expect(200);
    await wh.post(`/orders/${order2.id}/receive-bags`, { evidence: { photoUrl: EV.photoUrl }, counted: 2 }).expect(200); // บวกคืนเข้าตู้ 2 ใบ กลายเป็น 18

    const stationsAfterReturn = (await admin.get('/stations').expect(200)).body;
    const stAfterReturn = stationsAfterReturn.find((s: { id: number }) => s.id === stationId);
    expect(stAfterReturn.bagBalance).toBe(18);

    const ledger = (await admin.get(`/admin/stations/${stationId}/ledger`).expect(200)).body;
    expect(ledger.some((l: { movement: string; qty: number }) => l.movement === 'DISPENSED_OUT' && l.qty === -3)).toBe(true);
    expect(ledger.some((l: { movement: string; qty: number }) => l.movement === 'RETURNED_IN' && l.qty === 2)).toBe(true);
  });

  it('3. ลูกค้า & วงเงินเครดิต: แอดมินตั้งวงเงิน + พิกัดบ้านลูกค้า และระบบบล็อกเมื่อสั่งเกินวงเงินเครดิต', async () => {
    const c = as('cust-credit');
    const reg = await c.post('/me/register', { name: 'คุณเครดิต', phone: '0823334444', pdpaConsent: true }).expect(201);
    const addr = await c
      .post('/me/addresses', { label: 'บ้าน', detail: 'สุขุมวิท 24', lat: 13.72, lng: 100.56 })
      .expect(201);

    // แอดมินปรับวงเงินเครดิตของลูกค้าเป็น 100 บาท (10,000 สตางค์) และอัปเดตพิกัดบ้าน
    const patched = await admin
      .patch(`/admin/customers/${reg.body.id}`, {
        name: 'คุณเครดิต VIP',
        phone: '0823334444',
        creditLimitSatang: 10000,
        addressDetail: 'สุขุมวิท 24 (อัปเดตพิกัด)',
        lat: 13.725,
        lng: 100.565,
      })
      .expect(200);
    expect(patched.body.creditLimitSatang).toBe(10000);

    // สั่งซื้อแบบ CREDIT 3 ถัง (180 บาท = 18,000 สตางค์ > 10,000 สตางค์) ต้องถูกปฏิเสธ 422 CREDIT_LIMIT_EXCEEDED
    const over = await c.post('/orders', {
      addressId: addr.body.id,
      items: [{ productId: 1, qty: 3 }],
      paymentMethod: 'CREDIT',
    });
    expect(over.status).toBe(422);
    expect(over.body.code).toBe('CREDIT_LIMIT_EXCEEDED');

    // สั่งซื้อแบบ CREDIT 1 ถัง (60 บาท = 6,000 สตางค์ <= 10,000 สตางค์) ต้องสำเร็จ
    const within = await c
      .post('/orders', {
        addressId: addr.body.id,
        items: [{ productId: 1, qty: 1 }],
        paymentMethod: 'CREDIT',
      })
      .expect(201);
    expect(within.body.paymentMethod).toBe('CREDIT');
  });

  it('4. ตั้งค่าโหมดการแสดงผลหลังบ้าน (Grid / Card): บันทึกลงฐานข้อมูล Server และดึงค่ากลับมาได้ตรงกัน', async () => {
    const initial = await admin.get('/admin/preferences').expect(200);
    expect(['card', 'grid']).toContain(initial.body.viewMode);

    const savedGrid = await admin.patch('/admin/preferences', { viewMode: 'grid' }).expect(200);
    expect(savedGrid.body.viewMode).toBe('grid');

    const afterGrid = await admin.get('/admin/preferences').expect(200);
    expect(afterGrid.body.viewMode).toBe('grid');

    const savedCard = await admin.patch('/admin/preferences', { viewMode: 'card' }).expect(200);
    expect(savedCard.body.viewMode).toBe('card');
  });
});
