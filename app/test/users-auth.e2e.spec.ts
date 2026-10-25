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

let app: INestApplication;
let server: Parameters<typeof request>[0];
let pool: Pool;

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

describe('ระบบ Login หลังบ้าน (Username/Password) และ User Management CRUD', () => {
  let adminToken = '';

  it('1. ล็อกอินด้วยรหัสผิด = 401, ล็อกอินด้วย admin / admin1234 = 200 พร้อม JWT Token', async () => {
    const bad = await request(server).post('/auth/login').send({ username: 'admin', password: 'wrong' });
    expect(bad.status).toBe(401);

    const ok = await request(server).post('/auth/login').send({ username: 'admin', password: 'admin1234' }).expect(200);
    expect(ok.body.token).toBeDefined();
    expect(ok.body.user.username).toBe('admin');
    expect(ok.body.user.role).toBe('admin');
    expect(ok.body.user.passwordHash).toBeUndefined();
    adminToken = ok.body.token;
  });

  it('2. ใช้ JWT Token เรียก User Management CRUD (Create, Read, Update, Hard Delete)', async () => {
    const list1 = await request(server)
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list1.body.length).toBeGreaterThanOrEqual(4);

    // Create (C)
    const created = await request(server)
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'staff1',
        password: 'pass1234',
        name: 'พนักงานคลัง 1',
        phone: '0812223333',
        role: 'warehouse',
      })
      .expect(201);
    expect(created.body.username).toBe('staff1');
    expect(created.body.role).toBe('warehouse');
    expect(created.body.hasPassword).toBe(true);

    // ทดสอบล็อกอินด้วยบัญชีที่เพิ่งสร้าง
    await request(server).post('/auth/login').send({ username: 'staff1', password: 'pass1234' }).expect(200);

    // Update (U) — เปลี่ยนรหัสผ่านและเปลี่ยน Role เป็น admin
    const updated = await request(server)
      .patch(`/admin/users/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'หัวหน้าคลัง 1',
        role: 'admin',
        password: 'newpassword99',
      })
      .expect(200);
    expect(updated.body.name).toBe('หัวหน้าคลัง 1');
    expect(updated.body.role).toBe('admin');

    // รหัสเก่าต้องใช้ไม่ได้ รหัสใหม่ต้องใช้ได้
    await request(server).post('/auth/login').send({ username: 'staff1', password: 'pass1234' }).expect(401);
    await request(server).post('/auth/login').send({ username: 'staff1', password: 'newpassword99' }).expect(200);

    // Delete (D) — ยังไม่มีประวัติออเดอร์ ต้องเป็น HARD_DELETE
    const del = await request(server)
      .delete(`/admin/users/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(del.body.mode).toBe('HARD_DELETE');
  });

  it('3. กรณีผู้ใช้มีประวัติออเดอร์แล้ว: การลบต้องเป็น SOFT_DELETE (ระงับบัญชี) เพื่อรักษา Audit Trail', async () => {
    const cust = await request(server)
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'cust_with_order',
        password: 'cust1234',
        lineUserId: 'U_cust_del_test',
        name: 'ลูกค้ามีออเดอร์',
        phone: '0897776666',
        role: 'customer',
      })
      .expect(201);

    const addr = await request(server)
      .post('/me/addresses')
      .set('x-dev-user', 'U_cust_del_test')
      .send({ label: 'บ้าน', detail: 'สุขุมวิท', lat: 13.75, lng: 100.5 })
      .expect(201);

    await request(server)
      .post('/orders')
      .set('x-dev-user', 'U_cust_del_test')
      .send({ addressId: addr.body.id, items: [{ productId: 1, qty: 1 }], paymentMethod: 'CASH' })
      .expect(201);

    const del = await request(server)
      .delete(`/admin/users/${cust.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(del.body.mode).toBe('SOFT_DELETE');
    expect(del.body.active).toBe(false);

    // บัญชีที่ถูกระงับต้องล็อกอินไม่ได้อีก
    await request(server).post('/auth/login').send({ username: 'cust_with_order', password: 'cust1234' }).expect(401);
  });
});
