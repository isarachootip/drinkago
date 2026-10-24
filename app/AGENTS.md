# AGENTS.md — Drink&Go API

คู่มือสำหรับ AI agent (Antigravity และอื่นๆ) และนักพัฒนาที่มาทำงานต่อในโปรเจกต์นี้
อ่านไฟล์นี้ก่อนเริ่มงานทุกครั้ง แล้วอ่าน `docs/HANDOFF.md` เพื่อดูสถานะและงานถัดไป

## โปรเจกต์นี้คืออะไร

Backend ของระบบขายน้ำดื่มผ่าน LINE OA + จัดส่ง (ลูกค้าสั่งใน LIFF, คลังจัดของ, ไรเดอร์ส่ง, รับถุงคืน)
แกนของระบบมีสองอย่าง ห้ามทำให้อ่อนลง:

1. **Order state machine** ทุกขั้นมีผู้ยืนยัน มีหลักฐาน และย้อนตรวจได้
2. **บัญชีถุง (bag ledger)** ถุงคืนเป็นบัญชีเดินสะพัด ไม่ใช่ตัวเลขที่เขียนทับ

เอกสารออกแบบเต็ม: `../Drink&Go-System-Design.docx` · mockup หน้าจอ LIFF: `../mockups/`

## Stack

NestJS 10 · TypeScript (strict) · PostgreSQL 16 · Drizzle ORM · zod · Jest + supertest · Node 22

## คำสั่ง

```bash
npm install
docker compose up -d db     # PostgreSQL ที่พอร์ต 5433 (เครื่องพัฒนามี PostgreSQL 17 ใช้ 5432 อยู่แล้ว ห้ามชน)
npm run setup               # migrate + seed
npm run dev                 # http://localhost:3000
npm run typecheck
npm test                    # unit + e2e (e2e ล้างฐานข้อมูล drinkgo_test ทุกครั้ง)
npm run db:generate         # สร้าง migration หลังแก้ src/db/schema.ts
```

npm scripts เรียก `node node_modules/...` ตรงๆ โดยตั้งใจ (npm บน Windows พังเมื่อ path มี `&`) อย่าเปลี่ยนกลับเป็นคำสั่งใน `.bin`

## โครงสร้าง

```
src/orders/order-state-machine.ts   ตารางการเปลี่ยนสถานะ + กฎ (pure function)
src/orders/orders.service.ts        transition() กลาง + ทุกขั้นของ Flow
src/bags/bag-ledger.service.ts      บัญชีถุง
src/common/auth.ts                  AuthGuard, @Roles, @CurrentUser, dev/LINE auth
src/common/errors.ts                DomainError + ErrorFilter (แปลงเป็น HTTP)
src/common/validate.ts              parse(zodSchema, body), evidenceSchema
src/notifications/                  outbox + LINE push
src/line/                           webhook (ลายเซ็น + กันซ้ำ)
src/db/schema.ts                    ตารางทั้งหมด
drizzle/                            migration SQL (commit ทุกไฟล์)
test/                               *.spec.ts
```

## กฎที่ต้องรักษา (invariants)

ถ้างานใดต้องฝืนข้อเหล่านี้ ให้หยุดและถามเจ้าของโปรเจกต์ก่อน

1. **เปลี่ยน `orders.status` ผ่าน `OrdersService.transition()` เท่านั้น** ห้าม `update(orders).set({ status })` ที่อื่น สถานะใหม่หรือเส้นทางใหม่ต้องเพิ่มใน `TRANSITIONS` พร้อมเทสต์
2. **ทุกการเปลี่ยนสถานะทำใน transaction ที่ล็อกแถวออเดอร์** (`withLockedOrder`) และแจ้งเตือนผ่าน `notify.enqueue(tx, …)` ใน transaction เดียวกัน ห้ามเรียก LINE API ตรงจาก service
3. **`order_events` และ `bag_ledger` เป็น append-only** มี trigger ในฐานข้อมูลบังคับ ห้ามเขียน migration ที่ลบ trigger หรือแก้แถวเดิม การแก้ยอดให้เพิ่มรายการใหม่ (เช่น `WRITTEN_OFF`)
4. **ยอดถุงค้างคำนวณจาก `SUM(qty)` เสมอ** ห้ามเพิ่มคอลัมน์เก็บยอดคงค้าง
5. **บทบาทอ่านจากตาราง `users` เท่านั้น** ห้ามรับ role จาก body/header/token
6. **ขั้น 4, 6, 7 ต้องมีรูป + GPS ขั้น 8 ต้องมีรูป** ตัดสินใน state machine (ตอบ 422 `EVIDENCE_REQUIRED`) ไม่ใช่ใน zod
7. **เงินเก็บเป็นสตางค์ (integer)** ห้ามใช้ float กับเงิน
8. **`AUTH_MODE=dev` บนเซิร์ฟเวอร์ต้องมี `DEV_AUTH_KEY`** ห้ามลบการตรวจนี้ใน `config.ts`
9. **OTP ส่งมอบให้ลูกค้าเห็นเท่านั้น** (`getVisible` ตัด `deliveryOtp` ออกสำหรับบทบาทอื่น)

## แนวทางเขียนโค้ด

- ตรวจ input ด้วย zod ผ่าน `parse()` ใน controller, logic อยู่ใน service
- error ทางธุรกิจใช้ `DomainError(status, CODE, ข้อความภาษาไทย)` ให้ `code` เป็น UPPER_SNAKE ที่ frontend ใช้ตัดสินใจได้
- ข้อความถึงผู้ใช้เป็นภาษาไทย ชื่อตัวแปร/โค้ด/commit เป็นภาษาอังกฤษ
- inject ด้วย token ชัดเจน (`@Inject(DB)`, `@Inject(APP_CONFIG)`)
- แก้ schema → `npm run db:generate` → ตรวจ SQL ที่ได้ → commit ทั้ง `drizzle/*.sql` และ `drizzle/meta/*`
- ห้าม commit `.env`, `.env.production`, `backups/`

## นิยามคำว่า "เสร็จ"

- `npm run typecheck` ผ่าน และ `npm test` ผ่านทั้งหมด (ต้องเปิด `docker compose up -d db`)
- ฟีเจอร์ใหม่มี e2e test ใน `test/` ครอบคลุมทางสำเร็จและทางที่ต้องถูกปฏิเสธ
- endpoint ใหม่อยู่ในตาราง API ของ `README.md`
- อัปเดตส่วน "สถานะ" ใน `docs/HANDOFF.md`
- 1 งาน = 1 commit ที่อธิบายว่าเปลี่ยนอะไรและทำไม

## สภาพแวดล้อมเครื่องพัฒนา

- Windows + PowerShell, โฟลเดอร์ `C:\atgv\drinkago\app`
- PostgreSQL 17 ของเครื่องรันที่ 5432 (เป็นของโปรเจกต์อื่น ห้ามใช้หรือแก้)
- Docker Desktop บางครั้งค้างตอนเปิด ถ้า `docker version` ไม่ตอบ ให้ผู้ใช้เปิดเองจากเมนู Start
- ติดตั้งบน VPS: `DEPLOY.md`
