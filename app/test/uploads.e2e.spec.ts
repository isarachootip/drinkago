import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { loadConfig } from '../src/config';
import { runMigrations } from '../src/db/migrate';
import { seed } from '../src/db/seed';

const URL = process.env.TEST_DATABASE_URL ?? 'postgres://drinkgo:drinkgo@localhost:5433/drinkgo_test';
const TEST_UPLOAD_DIR = resolve(__dirname, '../test-uploads');

let app: INestApplication;
let server: Parameters<typeof request>[0];

const as = (lineUserId: string) => ({
  get: (p: string) => request(server).get(p).set('x-dev-user', lineUserId),
  post: (p: string, body: object = {}) => request(server).post(p).set('x-dev-user', lineUserId).send(body),
  upload: (p: string, fileBuffer: Buffer, filename: string, mime: string) =>
    request(server)
      .post(p)
      .set('x-dev-user', lineUserId)
      .attach('file', fileBuffer, { filename, contentType: mime }),
});

const rider = as('dev-rider');
const wh = as('dev-warehouse');
const customer = as('cust-upload-test');
const userId = async (lineUserId: string) => (await as(lineUserId).get('/me').expect(200)).body.id as string;

beforeAll(async () => {
  await fs.mkdir(TEST_UPLOAD_DIR, { recursive: true });
  process.env.PUBLIC_UPLOAD_BASE_URL = 'http://localhost:3000/uploads';

  const cfg = loadConfig({
    DATABASE_URL: URL,
    AUTH_MODE: 'dev',
    NOTIFY_DISPATCH_INTERVAL_MS: '0',
    UPLOAD_DIR: TEST_UPLOAD_DIR,
    PUBLIC_UPLOAD_BASE_URL: 'http://localhost:3000/uploads',
  } as unknown as NodeJS.ProcessEnv);

  const mod = await Test.createTestingModule({ imports: [AppModule.forRoot(cfg)] }).compile();
  app = mod.createNestApplication({ rawBody: true, logger: false });
  await app.init();
  server = app.getHttpServer();
});

afterAll(async () => {
  await app?.close();
  await fs.rm(TEST_UPLOAD_DIR, { recursive: true, force: true });
});

describe('Uploads & Evidence Verification (B1)', () => {
  const dummyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );

  it('ไรเดอร์อัปโหลดรูปภาพสำเร็จ ได้ URL ภายในระบบ', async () => {
    const res = await rider
      .upload('/uploads', dummyPng, 'evidence.png', 'image/png')
      .expect(201);

    expect(res.body.url).toMatch(/^http:\/\/localhost:3000\/uploads\/[a-f0-9-]+\.png$/);

    // ตรวจสอบว่าสามารถ GET รูปภาพที่อัปโหลดได้
    const filename = res.body.url.split('/').pop()!;
    const getRes = await request(server).get(`/uploads/${filename}`).expect(200);
    expect(getRes.headers['content-type']).toMatch(/image\/png/);
  });

  it('ปฏิเสธไฟล์ที่ไม่ใช่รูปภาพด้วย 400 INVALID_FILE_TYPE', async () => {
    const txtBuffer = Buffer.from('hello world', 'utf-8');
    const res = await rider
      .upload('/uploads', txtBuffer, 'hack.txt', 'text/plain')
      .expect(400);

    expect(res.body.code).toBe('INVALID_FILE_TYPE');
  });

  it('ปฏิเสธคำขอที่ไม่มีไฟล์แนบด้วย 400 FILE_REQUIRED', async () => {
    const res = await rider.post('/uploads', {}).expect(400);
    expect(res.body.code).toBe('FILE_REQUIRED');
  });

  it('ปฏิเสธลูกค้ารั่วไหลมาอัปโหลดด้วย 403 (เฉพาะ rider, warehouse, admin)', async () => {
    // ลงทะเบียน customer ก่อน
    await customer.post('/me/register', { name: 'เทสต์', phone: '0899999999', pdpaConsent: true }).expect(201);
    await customer.upload('/uploads', dummyPng, 'pic.png', 'image/png').expect(403);
  });

  it('บูรณาการกับ Order Flow: ใช้ URL จากระบบผ่าน pickup สำเร็จ แต่ URL ภายนอกถูกปฏิเสธ 400', async () => {
    const addr = await customer
      .post('/me/addresses', { label: 'บ้าน', detail: 'กทม', lat: 13.75, lng: 100.5 })
      .expect(201);

    const orderRes = await customer
      .post('/orders', { addressId: addr.body.id, items: [{ productId: 1, qty: 1 }], paymentMethod: 'CASH' })
      .expect(201);
    const orderId = orderRes.body.id;

    // warehouse ยืนยันและแพ็ก และมอบหมายไรเดอร์
    await wh.post(`/orders/${orderId}/confirm`).expect(200);
    await wh.post(`/orders/${orderId}/pack`).expect(200);
    await wh.post(`/orders/${orderId}/assign`, { riderId: await userId('dev-rider') }).expect(200);

    // ไรเดอร์อัปโหลดรูป
    const upRes = await rider
      .upload('/uploads', dummyPng, 'pickup.png', 'image/png')
      .expect(201);
    const validUrl = upRes.body.url;

    // ส่ง URL ภายนอก -> โดน 400 VALIDATION
    const rejectRes = await rider
      .post(`/orders/${orderId}/pickup`, {
        evidence: { photoUrl: 'https://evil-external-site.com/fake.jpg', lat: 13.75, lng: 100.5 },
      })
      .expect(400);
    expect(rejectRes.body.code).toBe('VALIDATION');

    // ส่ง URL ที่อัปโหลดผ่านระบบจริง -> สำเร็จ 200
    await rider
      .post(`/orders/${orderId}/pickup`, {
        evidence: { photoUrl: validUrl, lat: 13.75, lng: 100.5 },
      })
      .expect(200);
  });
});
