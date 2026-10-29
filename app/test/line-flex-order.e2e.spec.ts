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
import { addDaysIsoDate, getBangkokIsoDate, isoDateToThaiLabel } from '../src/events/meetup-date';

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
  del: (p: string) => request(server).delete(p).set('x-dev-user', u),
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
  it('1. แอดมินจัดการรูปภาพสินค้า (Catalog CRUD) แบบ Relative Path (/uploads/...) และซิงก์ Rich Menu 4 ปุ่มได้', async () => {
    const initialList = await admin.get('/admin/products').expect(200);
    expect(initialList.body[0].imageUrl).toBeNull();

    const created = await admin.post('/admin/products', {
      sku: 'WATER-CUP-24', name: 'น้ำดื่มแบบถ้วย 24 ถ้วย', priceSatang: 4500,
      isReturnable: false, imageUrl: 'http://localhost:3000/uploads/cup-initial.png',
    }).expect(201);
    expect(created.body.sku).toBe('WATER-CUP-24');
    expect(created.body.imageUrl).toBe('/uploads/cup-initial.png');

    const patched = await admin.patch(`/admin/products/${created.body.id}`, {
      sku: 'WATER-CUP-24-PRO',
      name: 'น้ำดื่มแบบถ้วยพรีเมียม 24 ถ้วย',
      priceSatang: 4800,
      isReturnable: true,
      imageUrl: 'http://localhost:3000/uploads/cup-pack.png',
      active: true,
    }).expect(200);
    expect(patched.body.sku).toBe('WATER-CUP-24-PRO');
    expect(patched.body.name).toBe('น้ำดื่มแบบถ้วยพรีเมียม 24 ถ้วย');
    expect(patched.body.priceSatang).toBe(4800);
    expect(patched.body.isReturnable).toBe(true);
    expect(patched.body.imageUrl).toBe('/uploads/cup-pack.png');

    // ทดสอบ Clear รูปภาพ (ส่ง imageUrl: null) และลบสินค้าที่ยังไม่เคยถูกสั่งซื้อ (HARD_DELETE)
    const cleared = await admin.patch(`/admin/products/${created.body.id}`, { imageUrl: null }).expect(200);
    expect(cleared.body.imageUrl).toBeNull();
    const hardDel = await admin.del(`/admin/products/${created.body.id}`).expect(200);
    expect(hardDel.body).toEqual({ id: created.body.id, deleted: true, mode: 'HARD_DELETE', active: false });

    const richSpec = await admin.get('/admin/line/rich-menu').expect(200);
    expect(richSpec.body.areas).toHaveLength(6);
    expect(richSpec.body.areas[0].action.data).toBe('action=events');
    expect(richSpec.body.areas[1].action.data).toBe('action=menu');
    expect(richSpec.body.areas[2].action.data).toBe('action=find_stations');
    expect(richSpec.body.areas[3].action.data).toBe('action=status');
    expect(richSpec.body.areas[4].action.data).toBe('action=share_oa');
    expect(richSpec.body.areas[5].action.data).toBe('action=visit_us');

    const synced = await admin.post('/admin/line/rich-menu/sync').expect(201);
    expect(synced.body.ok).toBe(true);
    expect(synced.body.areas).toBe(6);
    expect(synced.body.imageSource).toBe('bundled');

    const eventsList = await as('U_odm_cust_001').get('/events').expect(200);
    expect(eventsList.body.length).toBeGreaterThanOrEqual(1);
    expect(eventsList.body[0].locationName).toContain('โรงแรมอุทัยรัตน');

    // งานตั้งต้น (17 มีนา 2569) ผ่านไปแล้ว -> LINE action=events แจ้งว่าไม่มีงานใน 1 เดือนนี้ พร้อมลิงก์ดูทั้งหมด
    const emptyWindowPostback = await sendLineEvent('U_odm_cust_001', { type: 'postback', postback: { data: 'action=events' } }).expect(200);
    expect(JSON.stringify(emptyWindowPostback.body.replies)).toContain('tab=events&view=all');

    // แอดมินเพิ่มงานในอีก 7 วันข้างหน้า และงานในอีก 45 วันข้างหน้า -> ต้องดึงเฉพาะงานในช่วง 30 วันมาแสดงใน LINE
    const in7DaysThai = isoDateToThaiLabel(addDaysIsoDate(getBangkokIsoDate(), 7));
    const in45DaysThai = isoDateToThaiLabel(addDaysIsoDate(getBangkokIsoDate(), 45));
    await admin.post('/admin/events', {
      title: 'งานพบปะสมาชิกเดือนนี้', eventDate: in7DaysThai, eventTime: '10.30',
      locationName: 'ศูนย์ประชุมอุทัยธานี ฮอลล์ 2', contactPhone: '0634455',
    }).expect(201);
    await admin.post('/admin/events', {
      title: 'งานล่วงหน้าสองเดือน', eventDate: in45DaysThai, eventTime: '13.00',
      locationName: 'ฮอลล์ล่วงหน้าไกลเกินเดือน', contactPhone: '0890001111',
    }).expect(201);

    const win30Api = await request(server).get('/events?window=30d').expect(200);
    expect(win30Api.body).toHaveLength(1);
    expect(win30Api.body[0].locationName).toContain('ศูนย์ประชุมอุทัยธานี ฮอลล์ 2');

    const evPostback = await sendLineEvent('U_odm_cust_001', { type: 'postback', postback: { data: 'action=events' } }).expect(200);
    const evReplyJson = JSON.stringify(evPostback.body.replies);
    expect(evReplyJson).toContain('ศูนย์ประชุมอุทัยธานี ฮอลล์ 2');
    expect(evReplyJson).toContain('0634455');
    expect(evReplyJson).not.toContain('ฮอลล์ล่วงหน้าไกลเกินเดือน');

    const sharePostback = await sendLineEvent('U_odm_cust_001', { type: 'postback', postback: { data: 'action=share_oa' } }).expect(200);
    expect(JSON.stringify(sharePostback.body.replies)).toContain('https://line.me/R/nv/recommendOA/');
    expect(JSON.stringify(sharePostback.body.replies)).toContain('https://line.me/R/ti/p/');

    const visitPostback = await sendLineEvent('U_odm_cust_001', { type: 'postback', postback: { data: 'action=visit_us' } }).expect(200);
    expect(JSON.stringify(visitPostback.body.replies)).toContain('facebook.com');

    // ทดสอบค้นหาตู้เติมน้ำทั่วไทยแบบแบ่งกรุงเทพฯ และ 5 ภูมิภาค (ทั้ง Public API และ LINE Postback)
    const publicBkk = await request(server).get('/stations?region=BANGKOK&activeOnly=true').expect(200);
    expect(publicBkk.body).toHaveLength(10);
    const publicSouth = await request(server).get('/stations?region=SOUTH&activeOnly=true').expect(200);
    expect(publicSouth.body).toHaveLength(1);
    expect(publicSouth.body[0].code).toBe('ST-14');
    await request(server).get('/stations?region=INVALID_REGION').expect(400);

    const pickerRes = await sendLineEvent('U_odm_cust_001', { type: 'postback', postback: { data: 'action=find_stations' } }).expect(200);
    const pickerJson = JSON.stringify(pickerRes.body.replies);
    expect(pickerJson).toContain('action=stations_by_region&region=BANGKOK');
    expect(pickerJson).toContain('10 สาขา');
    expect(pickerJson).toContain('action=stations_by_region&region=SOUTH');
    expect(pickerJson).toContain('tab=stations');

    const southPostback = await sendLineEvent('U_odm_cust_001', {
      type: 'postback',
      postback: { data: 'action=stations_by_region&region=SOUTH' },
    }).expect(200);
    expect(JSON.stringify(southPostback.body.replies)).toContain('ST-14');
    expect(JSON.stringify(southPostback.body.replies)).toContain('สงขลา-หาดใหญ่');

    const northChat = await sendLineEvent('U_odm_cust_001', {
      type: 'message',
      message: { type: 'text', text: 'ค้นหาตู้ภาคเหนือ' },
    }).expect(200);
    expect(JSON.stringify(northChat.body.replies)).toContain('ST-11');
    expect(JSON.stringify(northChat.body.replies)).toContain('เชียงใหม่');
  });

  it('2. ลูกค้าสั่งน้ำผ่าน LINE Flex Menu → ตะกร้า Postback → แชร์พิกัด GPS → สร้างออเดอร์ PromptPay → ส่งสลิปในแชท', async () => {
    const lineUser = 'U_odm_cust_001';
    const menuRes = await sendLineEvent(lineUser, { type: 'message', message: { type: 'text', text: 'เมนู' } }).expect(200);
    expect(JSON.stringify(menuRes.body.replies)).toContain('action=quick_add&productId=1');

    await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=quick_add&productId=1' } }).expect(200);
    const incRes = await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=increase&productId=1' } }).expect(200);
    expect(JSON.stringify(incRes.body.replies)).toContain('฿120');

    const chkRes = await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=checkout' } }).expect(200);
    expect(JSON.stringify(chkRes.body.replies)).toContain('รายละเอียดที่อยู่สำหรับจัดส่ง');

    const addrRes = await sendLineEvent(lineUser, { message: { type: 'text', text: 'คุณสมศรี 089-888-7777 บ้านเลขที่ 99/1 ซอยอ่อนนุช 17' }, type: 'message' }).expect(200);
    expect(JSON.stringify(addrRes.body.replies)).toContain('แชร์โลเคชัน (GPS)');

    const locRes = await sendLineEvent(lineUser, { type: 'message', message: { type: 'location', latitude: 13.7136, longitude: 100.6106 } }).expect(200);
    expect(JSON.stringify(locRes.body.replies)).toContain('action=select_station&stationId=2');

    const stRes = await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=select_station&stationId=2' } }).expect(200);
    expect(JSON.stringify(stRes.body.replies)).toContain('action=pay_method&method=PROMPTPAY');

    const payRes = await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=pay_method&method=PROMPTPAY' } }).expect(200);
    const ticketJson = JSON.stringify(payRes.body.replies);
    expect(ticketJson).toContain('DG-');
    expect(ticketJson).toContain('ST-02');
    expect(ticketJson).toContain('promptpay.io/0899998888/120');

    const myOrders = await as(lineUser).get('/orders/mine').expect(200);
    expect(myOrders.body).toHaveLength(1);
    const order = myOrders.body[0];
    expect(order.status).toBe('CONFIRMED');
    expect(order.totalSatang).toBe(12000);
    expect(order.paymentMethod).toBe('PROMPTPAY');
    expect(order.paymentStatus).toBe('UNPAID');
    expect(order.stationId).toBe(2);

    const slipRes = await sendLineEvent(lineUser, { type: 'message', message: { id: 'line-img-999', type: 'image' } }).expect(200);
    expect(JSON.stringify(slipRes.body.replies)).toContain('PENDING_VERIFY');

    const verified = await admin.post(`/orders/${order.id}/verify-payment`).expect(200);
    expect(verified.body.paymentStatus).toBe('PAID');

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

    const stPrompt = await sendLineEvent(lineUser, { type: 'postback', postback: { data: `action=use_address&addressId=${detail.body.address.id}` } }).expect(200);
    expect(JSON.stringify(stPrompt.body.replies)).toContain('action=select_station&stationId=2');
    const bagPrompt = await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=select_station&stationId=2' } }).expect(200);
    expect(JSON.stringify(bagPrompt.body.replies)).toContain('action=set_bag_return&qty=2');
    await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=set_bag_return&qty=2' } }).expect(200);
    await sendLineEvent(lineUser, { type: 'postback', postback: { data: 'action=pay_method&method=CASH' } }).expect(200);
    const latestOrders = await as(lineUser).get('/orders/mine').expect(200);
    const newOrd = latestOrders.body[0];
    expect(newOrd.expectBagReturn).toBe(2);
    expect(newOrd.status).toBe('CONFIRMED');
    const newDetail = await as(lineUser).get(`/orders/${newOrd.id}`).expect(200);
    await as('dev-rider').post(`/orders/${newOrd.id}/claim`).expect(200);
    await as('dev-rider').post(`/orders/${newOrd.id}/pack`).expect(200);
    await as('dev-rider').post(`/orders/${newOrd.id}/pickup`, { evidence: ev }).expect(200);
    await as('dev-rider').post(`/orders/${newOrd.id}/start`).expect(200);
    const delivered = await as('dev-rider').post(`/orders/${newOrd.id}/deliver`, {
      evidence: ev, otp: newDetail.body.deliveryOtp, bagsCollected: 2, bagPhotoUrl: ev.photoUrl, autoCloseBags: true,
    }).expect(200);
    expect(delivered.body.status).toBe('CLOSED_WITH_RETURN');
    const softDel = await admin.del('/admin/products/1').expect(200);
    expect(softDel.body).toEqual({ id: 1, deleted: true, mode: 'SOFT_DELETE', active: false });
  });
});
