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
const LINE_SECRET = 'line-test-secret-odm';
let app: INestApplication;
let server: Parameters<typeof request>[0];
let pool: Pool;
let eventSeq = 1;

const as = (u: string) => ({
  get: (p: string) => request(server).get(p).set('x-dev-user', u),
  post: (p: string, b?: object) => request(server).post(p).set('x-dev-user', u).send(b ?? {}),
  patch: (p: string, b?: object) => request(server).patch(p).set('x-dev-user', u).send(b ?? {}),
});
const admin = as('dev-admin');

function sendLineEvent(lineUserId: string, ev: Record<string, unknown>) {
  const payload = JSON.stringify({
    events: [{ webhookEventId: `ev-odm-${Date.now()}-${eventSeq++}`, replyToken: 'reply-token-test', source: { userId: lineUserId }, ...ev }],
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
    DATABASE_URL: URL, AUTH_MODE: 'dev', LINE_CHANNEL_SECRET: LINE_SECRET,
    PROMPTPAY_ID: '0899998888', PROMPTPAY_ACCOUNT_NAME: 'บจก. ดริ้งค์ แอนด์ โก', NOTIFY_DISPATCH_INTERVAL_MS: '0',
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

describe('LINE Flex Menu Ordering (Delivery Only - สไตล์ ODM)', () => {
  it('1. แอดมินจัดการรูปภาพสินค้า (Catalog CRUD) และซิงก์ Rich Menu 4 ปุ่มได้', async () => {
    const created = await admin.post('/admin/products', {
      sku: 'WATER-CUP-24', name: 'น้ำดื่มแบบถ้วย 24 ถ้วย', priceSatang: 4500,
      isReturnable: false, imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=500',
    }).expect(201);
    expect(created.body.sku).toBe('WATER-CUP-24');

    const patched = await admin.patch(`/admin/products/${created.body.id}`, {
      priceSatang: 4800, imageUrl: '/uploads/cup-pack.png',
    }).expect(200);
    expect(patched.body.priceSatang).toBe(4800);
    expect(patched.body.imageUrl).toBe('/uploads/cup-pack.png');

    const richSpec = await admin.get('/admin/line/rich-menu').expect(200);
    expect(richSpec.body.areas).toHaveLength(4);

    const synced = await admin.post('/admin/line/rich-menu/sync').expect(201);
    expect(synced.body.ok).toBe(true);
    expect(synced.body.areas).toBe(4);
  });

  it('2. ลูกค้าสั่งน้ำผ่าน LINE Flex Menu → ตะกร้า Postback → แชร์พิกัด GPS → สร้างออเดอร์ PromptPay → ส่งสลิปในแชท', async () => {
    const lineUser = 'U_odm_cust_001';

    // 1) พิมพ์ "เมนู" เพื่อดู Product Carousel Flex
    const menuRes = await sendLineEvent(lineUser, { type: 'message', message: { type: 'text', text: 'เมนู' } }).expect(200);
    expect(JSON.stringify(menuRes.body.replies)).toContain('action=quick_add&productId=1');

    // 2) กดใส่ตะกร้า productId=1 (น้ำดื่มแบบถัง 60 บาท) และกด + เพิ่มเป็น 2 ถัง (120 บาท)
    await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=quick_add&productId=1' } }).expect(200);
    const incRes = await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=increase&productId=1' } }).expect(200);
    expect(JSON.stringify(incRes.body.replies)).toContain('฿120');

    // 3) กดยืนยันการสั่งซื้อ (action=checkout) -> ลูกค้าใหม่ระบบถามรายละเอียดที่อยู่
    const chkRes = await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=checkout' } }).expect(200);
    expect(JSON.stringify(chkRes.body.replies)).toContain('รายละเอียดที่อยู่สำหรับจัดส่ง');

    // 4) พิมพ์รายละเอียดบ้านเลขที่/ซอย -> ระบบให้แชร์โลเคชัน GPS
    const addrRes = await sendLineEvent(lineUser, { message: { type: 'text', text: 'คุณสมศรี 089-888-7777 บ้านเลขที่ 99/1 ซอยอ่อนนุช 17' }, type: 'message' }).expect(200);
    expect(JSON.stringify(addrRes.body.replies)).toContain('แชร์โลเคชัน (GPS)');

    // 5) ส่งพิกัด GPS ใกล้สาขาอ่อนนุช 17 (ST-02: 13.7135, 100.6105) -> ระบบ Suggest ตู้กดน้ำ ST-02 ที่ใกล้ที่สุด
    const locRes = await sendLineEvent(lineUser, { type: 'message', message: { type: 'location', latitude: 13.7136, longitude: 100.6106 } }).expect(200);
    expect(JSON.stringify(locRes.body.replies)).toContain('action=select_station&stationId=2');

    // ยืนยันเลือกตู้กดน้ำที่แนะนำ (stationId=2) -> ถุงค้าง = 0 จึงข้ามไปเลือกวิธีชำระเงินทันที
    const stRes = await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=select_station&stationId=2' } }).expect(200);
    expect(JSON.stringify(stRes.body.replies)).toContain('action=pay_method&method=PROMPTPAY');

    // 6) กดเลือกชำระเงินแบบ PROMPTPAY -> สร้างออเดอร์จริง (CONFIRMED อัตโนมัติ) + ส่งการ์ด OTP 4 หลัก + QR Code
    const payRes = await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=pay_method&method=PROMPTPAY' } }).expect(200);
    const ticketJson = JSON.stringify(payRes.body.replies);
    expect(ticketJson).toContain('DG-');
    expect(ticketJson).toContain('ST-02');
    expect(ticketJson).toContain('promptpay.io/0899998888/120');

    // ตรวจสอบในฐานข้อมูลว่าออเดอร์ถูกผูกกับตู้ ST-02 (id=2) และสถานะเป็น CONFIRMED ทันทีโดยไม่ต้องผ่าน Warehouse
    const myOrders = await as(lineUser).get('/orders/mine').expect(200);
    expect(myOrders.body).toHaveLength(1);
    const order = myOrders.body[0];
    expect(order.status).toBe('CONFIRMED');
    expect(order.totalSatang).toBe(12000);
    expect(order.paymentMethod).toBe('PROMPTPAY');
    expect(order.paymentStatus).toBe('UNPAID');
    expect(order.stationId).toBe(2);

    // 7) ส่งรูปภาพสลิปในแชท LINE -> ระบบบันทึกสลิปและเปลี่ยน paymentStatus เป็น PENDING_VERIFY
    const slipRes = await sendLineEvent(lineUser, { type: 'message', message: { id: 'line-img-999', type: 'image' } }).expect(200);
    expect(JSON.stringify(slipRes.body.replies)).toContain('PENDING_VERIFY');

    // แอดมินกดอนุมัติสลิปในหลังบ้าน -> PAID
    const verified = await admin.post(`/orders/${order.id}/verify-payment`).expect(200);
    expect(verified.body.paymentStatus).toBe('PAID');

    // 8) กดปุ่ม Rich Menu "สั่งซ้ำออเดอร์เดิม" (action=reorder) ได้ทันที
    const reorderRes = await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=reorder' } }).expect(200);
    expect(JSON.stringify(reorderRes.body.replies)).toContain('DG-');
    const afterReorder = await as(lineUser).get('/orders/mine').expect(200);
    expect(afterReorder.body).toHaveLength(2);
  });

  it('3. ไรเดอร์กดรับงานเอง (claim) โดยไม่ต้องมี Warehouse + ลูกค้าเลือกถุงคืน + ส่งน้ำพร้อมปิดงานถุงคืนอัตโนมัติ (CLOSED_WITH_RETURN)', async () => {
    const lineUser = 'U_odm_cust_001';
    const sug = await as(lineUser).get('/stations/suggest?lat=13.7136&lng=100.6106').expect(200);
    expect(sug.body).toHaveLength(15);
    expect(sug.body[0].code).toBe('ST-02');
    const sugRam = await as(lineUser).get('/stations/suggest?lat=13.8510&lng=100.6410').expect(200);
    expect(sugRam.body[0].code).toBe('ST-03');
    const sugPhut = await as(lineUser).get('/stations/suggest?lat=13.6460&lng=100.4930').expect(200);
    expect(sugPhut.body[0].code).toBe('ST-04');
    const sugCnx = await as(lineUser).get('/stations/suggest?lat=18.7960&lng=98.9682').expect(200);
    expect(sugCnx.body[0].code).toBe('ST-11');

    const myOrders = await as(lineUser).get('/orders/mine').expect(200);
    const firstOrder = myOrders.body[1]; // ออเดอร์แรก (2 ถัง, สถานะ CONFIRMED รอไรเดอร์รับงาน)
    const detail = await as(lineUser).get(`/orders/${firstOrder.id}`).expect(200);

    // ไรเดอร์เห็นงานในคิวกลาง (/rider/jobs) และกด claim รับงานเองโดยไม่ต้องมีคลังสินค้า
    const jobsBefore = await as('dev-rider').get('/rider/jobs').expect(200);
    expect(jobsBefore.body.some((j: { id: string; riderId: string | null }) => j.id === firstOrder.id && j.riderId === null)).toBe(true);
    await as('dev-rider').post(`/orders/${firstOrder.id}/claim`).expect(200);
    await as('dev-rider').post(`/orders/${firstOrder.id}/pack`).expect(200);
    const ev = { photoUrl: 'http://localhost:3000/uploads/pod.png', lat: 13.7136, lng: 100.6106 };
    await as('dev-rider').post(`/orders/${firstOrder.id}/pickup`, { evidence: ev }).expect(200);
    await as('dev-rider').post(`/orders/${firstOrder.id}/start`).expect(200);
    await as('dev-rider').post(`/orders/${firstOrder.id}/deliver`, {
      evidence: ev, otp: detail.body.deliveryOtp, bagsCollected: 0,
    }).expect(200);

    // ลูกค้ากดเพิ่มสินค้าเข้าตะกร้าและกด checkout -> ระบบเสนอ "ใช้ที่อยู่เดิม" -> แนะนำตู้กดน้ำ -> ถามจำนวนถุงคืน
    await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=quick_add&productId=1' } }).expect(200);
    const chk = await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=checkout' } }).expect(200);
    expect(JSON.stringify(chk.body.replies)).toContain('action=use_address&addressId=');

    const stPrompt = await sendLineEvent(lineUser, {
      type: 'postback', postback: { data: `action=use_address&addressId=${detail.body.address.id}` },
    }).expect(200);
    expect(JSON.stringify(stPrompt.body.replies)).toContain('action=select_station&stationId=2');

    const bagPrompt = await sendLineEvent(lineUser, {
      type: 'postback', postback: { data: 'action=select_station&stationId=2' },
    }).expect(200);
    expect(JSON.stringify(bagPrompt.body.replies)).toContain('action=set_bag_return&qty=2');

    // เลือกคืนทั้งหมด 2 ใบ -> เลือกจ่ายเงินสด (CASH)
    await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=set_bag_return&qty=2' } }).expect(200);
    await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=pay_method&method=CASH' } }).expect(200);

    const latestOrders = await as(lineUser).get('/orders/mine').expect(200);
    const newOrd = latestOrders.body[0];
    expect(newOrd.expectBagReturn).toBe(2);
    expect(newOrd.status).toBe('CONFIRMED');
    const newDetail = await as(lineUser).get(`/orders/${newOrd.id}`).expect(200);

    // ไรเดอร์รับงานใหม่ กดน้ำ ส่งน้ำ + รับถุงคืน 2 ใบ พร้อม autoCloseBags=true -> ปิดงาน CLOSED_WITH_RETURN ทันทีโดยไม่มีขั้นที่ 8
    await as('dev-rider').post(`/orders/${newOrd.id}/claim`).expect(200);
    await as('dev-rider').post(`/orders/${newOrd.id}/pack`).expect(200);
    await as('dev-rider').post(`/orders/${newOrd.id}/pickup`, { evidence: ev }).expect(200);
    await as('dev-rider').post(`/orders/${newOrd.id}/start`).expect(200);
    const delivered = await as('dev-rider').post(`/orders/${newOrd.id}/deliver`, {
      evidence: ev, otp: newDetail.body.deliveryOtp, bagsCollected: 2, bagPhotoUrl: ev.photoUrl, autoCloseBags: true,
    }).expect(200);
    expect(delivered.body.status).toBe('CLOSED_WITH_RETURN');
  });
});
