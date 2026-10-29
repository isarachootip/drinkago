# Drink&Go API

Backend ของระบบขายน้ำผ่าน LINE + Delivery (สปรินต์ 1: แกนกลาง)
ออกแบบตามเอกสาร `../Drink&Go-System-Design.docx`

> ทำงานต่อ (คนหรือ AI agent): อ่าน [AGENTS.md](AGENTS.md) และ [docs/HANDOFF.md](docs/HANDOFF.md) ก่อน

**สร้างด้วย:** NestJS 10 · TypeScript · PostgreSQL 16 · Drizzle ORM · Jest

## เริ่มใช้งาน (Windows)

ต้องมี Node.js 22 และ Docker Desktop

```powershell
cd C:\atgv\drinkago\app
copy .env.example .env
npm install
docker compose up -d db      # เปิด PostgreSQL ที่พอร์ต 5433 (ไม่ชนกับ PostgreSQL ที่ติดตั้งในเครื่อง)
npm run setup                # สร้างตาราง + ข้อมูลตั้งต้น
npm run dev                  # เปิด API ที่ http://localhost:3000
npm test                     # ทดสอบครบ Flow 8 ขั้น (26 เทสต์)
```

ตอนนี้ยังไม่มีบัญชี LINE จึงใช้ `AUTH_MODE=dev`: ระบุตัวตนด้วย header `x-dev-user`
ผู้ใช้ทดสอบที่สร้างไว้แล้ว: `dev-admin`, `dev-warehouse`, `dev-rider`, `dev-rider-2`
ลูกค้าใช้ค่าอะไรก็ได้ แล้วลงทะเบียนผ่าน `POST /me/register`
ไฟล์ `api.http` มีตัวอย่างเรียกครบ Flow (เปิดด้วย VS Code + ส่วนเสริม REST Client)

## ติดตั้งบน VPS

ดู [DEPLOY.md](DEPLOY.md): Docker Compose + HTTPS อัตโนมัติ (Caddy) + สำรองข้อมูลรายวัน
บนเซิร์ฟเวอร์ โหมด dev ต้องตั้ง `DEV_AUTH_KEY` และส่ง header `x-dev-key` ทุกคำขอ

## โครงสร้าง

```
src/
  orders/order-state-machine.ts  กฎการเปลี่ยนสถานะ (pure function)
  orders/orders.service.ts       transition() กลาง + ทุกขั้นของ Flow
  bags/bag-ledger.service.ts     บัญชีถุง ISSUED / COLLECTED / RECEIVED / WRITTEN_OFF
  common/auth.ts                 ยืนยันตัวตน (dev header หรือ LINE ID token) + สิทธิ์ตามบทบาท
  notifications/                 outbox + ส่ง LINE Push (ไม่มี token = พิมพ์ลง log)
  line/line-webhook.controller.ts ตรวจลายเซ็น + กัน webhook ซ้ำ
  db/schema.ts                   ตารางทั้งหมด
drizzle/                         ไฟล์ migration SQL
test/                            unit + e2e
```

## หลักการที่ระบบบังคับ

| หลักการ | ทำที่ไหน |
|---|---|
| เปลี่ยนสถานะได้ทางเดียวผ่าน `transition()` ตามตารางที่อนุญาต | `order-state-machine.ts`, `orders.service.ts` |
| บทบาทอ่านจากฐานข้อมูลเสมอ ไม่เชื่อค่าจาก client | `common/auth.ts` |
| ขั้น 4, 6, 7 ต้องมีรูป + GPS, ขั้น 8 ต้องมีรูป (ไม่ครบ = 422) | `order-state-machine.ts` |
| ไรเดอร์ทำได้เฉพาะงานที่ได้รับมอบหมาย | `order-state-machine.ts` |
| ส่งสำเร็จต้องกรอกรหัส 4 หลักจากลูกค้า (ปิดได้ด้วย `REQUIRE_DELIVERY_OTP=false`) | `orders.service.ts` |
| กดพร้อมกันสำเร็จครั้งเดียว (ล็อกแถว `SELECT … FOR UPDATE`) | `orders.service.ts` |
| `order_events` และ `bag_ledger` แก้/ลบไม่ได้ (trigger ในฐานข้อมูล) | `drizzle/0001_append_only_guards.sql` |
| ยอดถุงค้าง = `SUM(qty)` รับคืนเกินยอดค้างไม่ได้ | `bag-ledger.service.ts` |
| ยอดถุงขั้น 7 ≠ ขั้น 8 → ไม่ปิดงาน แจ้งแอดมิน | `orders.service.ts` |
| แจ้งเตือนบันทึกใน transaction เดียวกับสถานะ แล้วค่อยส่ง (ไม่หาย ไม่ส่งก่อนบันทึก) | `notifications.service.ts` |
| คำสั่งเปลี่ยนสถานะรองรับ `Idempotency-Key` (กดซ้ำไม่เบิ้ล, ข้อมูลเปลี่ยน = 422) | `common/idempotency.interceptor.ts` |

## API

ทุก endpoint ต้องระบุตัวตน ยกเว้น `/health` และ `/line/webhook`

| Method | Path | บทบาท | ขั้น |
|---|---|---|---|
| POST | `/auth/login` | ทุกบทบาท (Public) | เข้าสู่ระบบหลังบ้าน/คลังด้วย Username + Password |
| GET/POST/PATCH/DELETE | `/admin/users`, `/admin/users/:id` | admin | User Management CRUD (เพิ่ม/ดู/แก้ไข/ลบผู้ใช้งานทุกบทบาท) |
| POST | `/me/register` | ผู้ใช้ LINE ใหม่ | ลงทะเบียน + PDPA |
| GET/POST | `/me/addresses` | customer | |
| GET | `/me/bags` | customer | ยอดถุงค้าง + ประวัติ |
| GET | `/products` | ทุกบทบาท | รายการสินค้าที่เปิดขาย |
| GET/POST/PATCH/DELETE | `/admin/products`, `/admin/products/:id` | warehouse, admin | บริหารจัดการ Product Master (SKU/ชื่อ/ราคา/ถุงคืน/รูปภาพสไตล์ ODM + Hard/Soft Delete) |
| GET | `/events` | ทุกบทบาท (Public) | รายการตารางกิจกรรมพบปะทีม `ilife` ที่เปิดแสดงผล |
| GET/POST/PATCH/DELETE | `/admin/events`, `/admin/events/:id` | warehouse, admin | จัดการตารางกิจกรรมพบปะ (วัน/เวลา/สถานที่/เบอร์โทร/พิกัดแผนที่ Google Maps) |
| GET/POST | `/admin/line/rich-menu`, `/admin/line/rich-menu/sync` | admin | ดูโครงสร้างและซิงก์ Rich Menu 6 ปุ่ม (กิจกรรมพบปะ, สั่งน้ำดื่ม, ค้นหาตู้เติมน้ำทั่วไทย, ติดตามสถานะ, เป็นเพื่อนกับเรา, เยี่ยมชมเรา) พร้อมภาพมาตรฐาน `ilife` |
| POST | `/orders` | customer | 1 สั่งซื้อ |
| POST | `/orders/reorder` | customer | 1 สั่งซ้ำ 1 คลิก |
| GET | `/orders/mine` | customer | |
| POST | `/orders/:id/payment-slip` | customer | แนบสลิป PromptPay |
| POST | `/orders/:id/cancel` | customer, admin | |
| GET | `/orders/:id`, `/orders/:id/events` | ตามสิทธิ์ | ดูออเดอร์ + audit trail |
| GET | `/orders?status=` | warehouse, admin | |
| POST | `/orders/:id/confirm` | warehouse, admin | 2 |
| POST | `/orders/:id/pack` | warehouse, admin, rider | 3 (พนักงานขนส่งกดน้ำ / คลังจัดของ) |
| GET | `/riders` | warehouse, admin | รายชื่อไรเดอร์ที่พร้อมรับงาน |
| POST | `/orders/:id/assign` | warehouse, admin | มอบหมายไรเดอร์ |
| POST | `/orders/:id/pickup` | rider | 4 (รูป + GPS) |
| POST | `/orders/:id/start` | rider | 5 |
| POST | `/orders/:id/deliver` | rider | 6 + 7 (รูป + GPS + OTP + จำนวนถุง) |
| POST | `/orders/:id/fail` | rider | ส่งไม่สำเร็จ |
| POST | `/orders/:id/receive-bags` | warehouse, admin | 8 (รูป + จำนวนที่นับ) |
| GET | `/rider/jobs` | rider | งานวันนี้ (ตั้งแต่ CONFIRMED ที่มอบหมายแล้ว) |
| POST | `/orders/:id/reschedule` | admin | นัดส่งใหม่ |
| POST | `/orders/:id/resolve-bags` | admin | เคลียร์ยอดถุงไม่ตรง |
| POST | `/orders/:id/verify-payment` | admin | ยืนยันสลิป |
| POST | `/orders/:id/unlock-otp` | admin | ปลดล็อก OTP หลังกรอกผิดครบ 5 ครั้ง |
| GET | `/admin/bag-mismatches` | admin | |
| GET | `/stations` | ทุกบทบาท | รายการตู้กดน้ำ + ยอดสต็อกถุงประจำตู้ |
| GET | `/stations/suggest?lat=&lng=` | ทุกบทบาท | Suggest ตู้กดน้ำที่ใกล้พิกัดบ้านลูกค้าที่สุด เรียงตามระยะทาง (กม.) |
| POST | `/orders/:id/claim` | rider | ไรเดอร์กดรับงานเองจากคิวกลาง (ไม่ต้องรอคลังสินค้า) |
| POST/PATCH | `/admin/stations`, `/admin/stations/:id` | warehouse, admin | เพิ่ม/แก้ไขตู้กดน้ำและพิกัดนำทาง |
| POST | `/admin/stations/:id/bags` | warehouse, admin | เติมถุงเข้าตู้ (`RESTOCK_IN`) / ปรับยอด (`ADJUST`) |
| GET | `/admin/stations/:id/ledger` | warehouse, admin | ประวัติรับเข้า-จ่ายออกถุงประจำตู้เชื่อมกับสมาชิก |
| GET/PATCH | `/admin/preferences` | warehouse, admin | ดึงและบันทึกโหมดการแสดงผลหลังบ้าน (`card` / `grid`) ลงฐานข้อมูล Server |
| POST | `/admin/orders/clear` | admin | ล้างข้อมูลออเดอร์เก่า ประวัติถุงค้าง และรีเซ็ตสต็อกถุงตั้งต้น (50 ใบ/ตู้) เพื่อเริ่มทดสอบใหม่ |
| GET/POST/PATCH | `/admin/riders`, `/admin/riders/:id` | warehouse, admin | บริหารจัดการไรเดอร์ พาหนะ และโซน |
| GET/POST/PATCH | `/admin/customers`, `/admin/customers/:id` | warehouse, admin | บริหารจัดการลูกค้า พิกัดบ้าน และวงเงินเครดิต |
| GET | `/admin/customers/:id/bags` | admin | |
| POST | `/admin/customers/:id/bags/write-off` | admin | ตัดยอดถุง |
| POST | `/uploads` | rider, warehouse, admin | อัปโหลดรูปหลักฐาน (≤ 5MB) |
| GET | `/uploads/:filename` | ทุกบทบาท (public) | ดูรูปภาพที่อัปโหลด |
| POST | `/line/webhook` | LINE | ตรวจลายเซ็น |

จำนวนเงินเก็บเป็นสตางค์ (`priceSatang`, `totalSatang`) ราคาใน `src/db/seed.ts` เป็นค่าตัวอย่าง

## เมื่อมีบัญชี LINE แล้ว

1. สร้าง LINE Official Account และ Provider ใน LINE Developers Console
2. สร้าง Messaging API channel → คัดลอก Channel secret และ Channel access token
3. สร้าง LINE Login channel → คัดลอก Channel ID แล้วเพิ่ม LIFF app
4. ใส่ค่าใน `.env` แล้วตั้ง `AUTH_MODE=line`
5. ตั้ง Webhook URL เป็น `https://<โดเมน>/line/webhook` (ต้องเป็น HTTPS)

## สิ่งที่ยังไม่อยู่ในสปรินต์นี้

- อัปโหลดรูปจริง (ตอนนี้รับเป็น URL) → เชื่อม Object Storage
- หน้า LIFF ลูกค้า/ไรเดอร์/คลัง และ Back Office
- Flex Message, Rich Menu, ตอบข้อความใน webhook
- ตรวจสลิปอัตโนมัติ, สั่งประจำ, จัดเส้นทาง, เชื่อม Lalamove/Grab
