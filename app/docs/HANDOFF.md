# HANDOFF — Drink&Go

ส่งต่องานจาก Claude ให้ Antigravity · อัปเดตล่าสุด 22 ต.ค. 2569
อ่าน `AGENTS.md` ก่อน (กฎที่ห้ามฝืน + คำสั่ง)

## 1. สถานะตอนนี้

**สปรินต์ 1 (Backend แกนกลาง) เสร็จแล้ว** commit `044a3c5` และ `08b347c`

| ส่วน | สถานะ | หมายเหตุ |
|---|---|---|
| Schema + migration | ✅ | 10 ตาราง, trigger append-only |
| Order state machine (Flow 8 ขั้น) | ✅ | รองรับทั้งคลังและไรเดอร์ (ที่ได้รับมอบหมาย) กดขั้น 3 (`PACKED` / พนักงานขนส่งกดน้ำ) |
| บัญชีถุง + แจ้งยอดไม่ตรง | ✅ | |
| API ลูกค้า / คลัง / ไรเดอร์ / แอดมิน | ✅ | ตาราง API ใน `README.md` |
| Dev auth + LINE ID token + Staff Password Auth | ✅ | รองรับ Login หลังบ้าน/คลังด้วย `username` + `password` (`POST /auth/login` → JWT) ค่าเริ่มต้น `admin` / `admin1234` และ `warehouse` / `warehouse1234` |
| User Management CRUD (`/admin/users`) | ✅ | เพิ่ม/ดู/แก้ไข/ตั้งรหัสผ่าน/ลบผู้ใช้ครบทุกบทบาท (Hard Delete ถ้ายังไม่มีประวัติ, Soft Delete ถ้ามีประวัติผูกกับ Audit Trail) |
| LINE webhook (ลายเซ็น + กันซ้ำ + ตอบกลับ自动) | ✅ | เชื่อม LINE OA `@157iywjs` (`llife`), ลงทะเบียนลูกค้าอัตโนมัติเมื่อแอดเพื่อน/ทักแชท และตอบกลับด้วยรหัส OTP ล่าสุด + ลิงก์ผูกบัญชี `?lineUserId=` |
| LINE Flex Menu Ordering (Delivery Only - สไตล์ ODM) | ✅ | สั่งน้ำดื่มผ่านแชท LINE 100% (Product Carousel → Interactive Cart Bubble `+`/`-` → แชร์พิกัด GPS → Suggest ตู้กดน้ำที่ใกล้ที่สุดให้ยืนยัน/เปลี่ยนตู้ได้ → เลือกจำนวนถุงคืน → เลือกวิธีชำระเงิน → สร้างออเดอร์เป็น `CONFIRMED` อัตโนมัติ → ไรเดอร์กด `claim` รับงานเอง และเมื่อรับถุงคืนจบงาน `CLOSED_WITH_RETURN` อัตโนมัติโดยไม่ต้องมี Warehouse) |
| Role-Based Web UI (`Customer` / `Rider` / `Admin`) | ✅ | แยกหน้าเว็บตามบทบาทจริง: ลูกค้าเห็นเฉพาะหน้าสั่งซื้อ/ติดตาม, ไรเดอร์เห็นเฉพาะหน้ารับงาน/ส่งน้ำ, เฉพาะ Admin เห็นแถบสลับดูทุกมุมมอง (ตัดแท็บ Warehouse ออก) |
| Training Agent & Knowledge Management (KM) | ✅ | แท็บ `📚 คู่มือ & Training (KM)` ใน Admin + ปุ่ม `🎓 คู่มือ` แยกตามบทบาท (`Customer` / `Rider` / `Admin`) พร้อมระบบถาม-ตอบ Interactive Training Agent Q&A และไฟล์ `TRAINING_GUIDE.md` |
| Catalog & Product Image CRUD (`/admin/products`) | ✅ | แอดมินเพิ่ม/แก้ไขสินค้า ราคา และอัปโหลดรูปภาพแสดงบน LINE Flex Menu ได้จากหน้าเว็บ |
| Notification outbox + LINE push | ✅ | รองรับ `LINE_CHANNEL_ACCESS_TOKEN` ส่งเข้าแชทจริง |
| B1 อัปโหลดรูปภาพหลักฐาน | ✅ | `FileStorage` + `POST /uploads` + e2e test |
| B2 Idempotency-Key สำหรับ Offline Sync | ✅ | ตาราง `idempotency_keys` + `IdempotencyInterceptor` + e2e test |
| B3 พร้อมเปิดสู่อินเทอร์เน็ต (CORS, Helmet, Rate Limit, OTP Lockout, CI) | ✅ | ล็อก OTP เมื่อผิด 5 ครั้ง + `POST /orders/:id/unlock-otp` + `test/security.e2e.spec.ts` |
| F1 หน้า LIFF ไรเดอร์ (`../web/`) | ✅ | Vite + React + TS + Zod + Offline Queue + นำทางไปจุดตู้กดน้ำและบ้านลูกค้าครบขั้น 3–7 |
| F2–F4 หน้าลูกค้า / คลังสินค้า / แอดมิน (`../web/`) | ✅ | ครบทุกบทบาท + Backend Web บริหารจัดการ Rider, ตู้กดน้ำ 15 สาขา (10 เขต กทม. รวมรามอินทรา 57 & พุทธบูชา 34 + 5 จังหวัดใหญ่ 5 ภาค) พร้อมสต็อกถุงประจำตู้ (`station_bag_ledger` 50 ใบ/ตู้), ลูกค้า + พิกัดบ้าน + วงเงินเครดิต |
| Docker Compose production + Coolify Dockerfile | ✅ | Multi-stage `Dockerfile` ที่ root build ทั้ง `web` และ `app` |

**ผลทดสอบ:** 53/53 (11 ชุดทดสอบ) ผ่านครบทุกชุดบน Windows + PostgreSQL 16 (พอร์ต 5433) และ Linux ผ่าน typecheck 100%

## 2. การตัดสินใจที่ทำไปแล้ว

| เรื่อง | ตัดสินใจ | เหตุผล |
|---|---|---|
| ภาษา/เฟรมเวิร์ก | NestJS + TypeScript | ผู้ใช้ยืนยัน ไม่ใช้ Go |
| สถาปัตยกรรม | Modular monolith | ขนาดธุรกิจยังไม่คุ้มแตก microservices |
| ORM | Drizzle | Prisma ต้องดาวน์โหลด engine binary ซึ่งถูกบล็อกในบางสภาพแวดล้อม |
| ตารางผู้ใช้ | `users` ตารางเดียว + `role` | ต่างจาก ER ในเอกสาร (แยก customers/riders) เพื่อให้ auth ผ่าน LINE ทางเดียว |
| ขั้น 3 (กดน้ำ/จัดของ) | ทั้ง `warehouse`, `admin` และ `rider` (เฉพาะคนที่ได้รับมอบหมาย) กด `POST /orders/:id/pack` ได้ | ให้ตรงตาม Flow การทำงานจริงที่พนักงานขนส่งกดน้ำเอง และเห็นงานตั้งแต่สถานะ `CONFIRMED` ใน `GET /rider/jobs` |
| ขั้น 6 + 7 | ไรเดอร์กดครั้งเดียว `POST /orders/:id/deliver` | ตรงกับ mockup หน้าไรเดอร์ |
| สินค้ามีถุง | 1 หน่วยสินค้า `is_returnable` = 1 ถุง | ยังรอคำตอบจากธุรกิจ (ข้อ 5) |
| ยอดถุงไม่ตรง | ค้างที่ `BAG_RETURNED` + แจ้งแอดมิน, แอดมินปิดด้วย `resolve-bags` | ไม่ตัดยอดลูกค้า เพราะลูกค้าคืนแล้ว ความต่างเกิดหลังจากนั้น |
| รูปหลักฐาน | รับเป็น URL | ระบบอัปโหลดยังไม่ทำ (งาน B1) |
| พอร์ต DB เครื่องพัฒนา | 5433 | 5432 เป็นของ PostgreSQL 17 โปรเจกต์อื่น |

## 3. ช่องโหว่ที่รู้แล้ว (ต้องแก้ก่อนเปิดให้ใช้จริง)

1. **ยังไม่ได้ตั้ง CORS** หน้า LIFF ที่อยู่คนละโดเมนจะเรียก API ไม่ได้ → งาน B3
2. **ยังไม่รองรับการส่งซ้ำแบบ offline** ถ้าแอปไรเดอร์ sync คำขอเดิมซ้ำ ครั้งที่สองจะได้ 409 แทนผลเดิม → ต้องมี `Idempotency-Key` (งาน B2)
3. **`photoUrl` เป็น URL อะไรก็ได้** ควรรับเฉพาะไฟล์ที่อัปโหลดผ่านระบบเรา (งาน B1)
4. **ไม่มี rate limit, helmet, structured log** (งาน B3)
5. **Docker image ยังไม่เคย build** ครั้งแรกบน VPS ให้ดู log ของ `up -d --build`
6. **OTP 4 หลักเดาได้** ควรจำกัดจำนวนครั้งที่กรอกผิดต่อออเดอร์ (งาน B3)

## 4. คำถามที่ธุรกิจยังไม่ตอบ (ถามเจ้าของก่อนทำส่วนที่เกี่ยว)

1. "ถุง" คือถุงใส่ขวดเปล่า ขวดเปล่าเอง หรือทั้งสองอย่าง มีค่ามัดจำไหม
2. ถุงค้างเกินกี่ใบ/กี่วัน จึงคิดเงินหรือระงับการสั่ง
3. ใช้ไรเดอร์ร้านอย่างเดียว หรือต้องเชื่อม Lalamove/Grab ตั้งแต่แรก
4. ปริมาณออเดอร์ต่อวันและจำนวนไรเดอร์ตอนเริ่ม
5. OTP จากลูกค้า หรือรูปถ่ายอย่างเดียวพอ (ตอนนี้บังคับ OTP, ปิดได้ด้วย `REQUIRE_DELIVERY_OTP=false`)
6. ลูกค้าองค์กรต้องวางบิล/ใบกำกับภาษีไหม
7. หลายสาขาหรือหลายคลังไหม
8. ราคาสินค้าจริง (ใน seed เป็นค่าตัวอย่าง)

## 5. งานถัดไป (เรียงตามลำดับที่แนะนำ)

### สปรินต์ 2 — ให้ไรเดอร์ใช้งานได้จริง

ทำ backend เสริมก่อน (B1–B3) แล้วค่อยทำหน้าไรเดอร์ (F1) เพราะหน้าไรเดอร์ต้องใช้ทั้งสามอย่าง

**[x] B1 อัปโหลดรูปหลักฐาน (เสร็จแล้ว)**
- `POST /uploads` (rider, warehouse) รับ `multipart/form-data` ≤ 5 MB เฉพาะ jpeg/png/webp คืน `{ url }`
- เก็บใน volume บน VPS ก่อน (`/data/uploads`) ออกแบบเป็น interface `FileStorage` เพื่อเปลี่ยนเป็น S3/R2 ภายหลัง
- `evidenceSchema.photoUrl` รับเฉพาะ URL ที่ขึ้นต้นด้วย `PUBLIC_UPLOAD_BASE_URL`
- เสิร์ฟรูปผ่าน signed URL หมดอายุ หรือผ่าน endpoint ที่ตรวจสิทธิ์ (รูปมีหน้าบ้านลูกค้า = ข้อมูลส่วนบุคคล)
- เสร็จเมื่อ: e2e อัปโหลด → ใช้ URL นั้นใน pickup ผ่าน, URL ภายนอกถูกปฏิเสธ 400

**[x] B2 Idempotency-Key สำหรับคำสั่งเปลี่ยนสถานะ (เสร็จแล้ว)**
- ตาราง `idempotency_keys(key, user_id, endpoint, response_status, response_body, created_at)` unique (user_id, key)
- ใช้กับ `pickup`, `start`, `deliver`, `fail`, `receive-bags`
- คำขอซ้ำ key เดิม → คืนผลเดิม ไม่ทำซ้ำ, key เดิมแต่ body ต่าง → 422
- เสร็จเมื่อ: e2e ส่ง deliver ซ้ำ 2 ครั้ง key เดียวกัน ได้ 200 ทั้งคู่ และบัญชีถุงมีรายการเดียว

**[x] B3 พร้อมเปิดสู่อินเทอร์เน็ต (เสร็จแล้ว)**
- CORS อนุญาตเฉพาะ `CORS_ORIGINS` (คั่นด้วยจุลภาค) ใน env
- `helmet`, rate limit (`@nestjs/throttler`) เข้มขึ้นที่ `/me/register` และ `/orders/:id/deliver`
- OTP ผิดเกิน 5 ครั้งต่อออเดอร์ → ล็อก ต้องให้แอดมินปลด (`POST /orders/:id/unlock-otp`)
- GitHub Actions: typecheck + test กับ service postgres:16
- เสร็จเมื่อ: เทสต์ CORS/OTP-lock ผ่าน, CI เขียว

**F1 หน้า LIFF ไรเดอร์** (ตาม `../mockups/RiderJobs.dc.html`, `RiderPOD.dc.html`)
- โฟลเดอร์ใหม่ `../web/` (แยก repo หรือ monorepo ก็ได้) Vite + React + TypeScript + `@line/liff`
- หน้า: งานวันนี้ (`GET /rider/jobs`), รับสินค้า (สแกน QR ออเดอร์ + ถ่ายรูป + GPS), ยืนยันส่ง (รูป + OTP + นับถุง + รูปถุง), ส่งไม่สำเร็จ
- ออฟไลน์: เก็บคำขอใน IndexedDB พร้อม `Idempotency-Key` แล้ว sync เมื่อกลับมาออนไลน์
- ปุ่มสูง ≥ 44px, ใช้มือเดียวได้, ภาษาไทย
- ระหว่างยังไม่มี LIFF จริง: รองรับโหมด dev ส่ง `x-dev-user` + `x-dev-key` จากค่าที่ตั้งในหน้า settings

### สปรินต์ 3 — ลูกค้าสั่งผ่าน LINE ได้จริง

ต้องมีบัญชี LINE ก่อน (ขั้นตอนใน `README.md` ส่วน "เมื่อมีบัญชี LINE แล้ว")
- **F2 หน้า LIFF ลูกค้า** ตาม `Main.dc.html`, `Track.dc.html`: ลงทะเบียน + PDPA, ที่อยู่ (ปักหมุด), สั่งซื้อ/สั่งซ้ำ, ติดตาม, ยอดถุง, แนบสลิป
- **B4 LINE ครบวง:** follow → ส่งลิงก์ลงทะเบียน, Rich Menu (สั่งน้ำ/สั่งซ้ำ/ติดตาม/ถุงค้าง), แจ้งเตือนเป็น Flex Message, ตอบข้อความด้วย Reply API (ไม่นับโควตา)
- สลับ `AUTH_MODE=line` และลบ `DEV_AUTH_KEY` บน VPS

### สปรินต์ 4 — คลังและแอดมิน

- **F3 หน้า LIFF คลัง:** รับออเดอร์, ใบจัดของพร้อม QR, รับถุงเข้าคลัง
- **F4 Back Office (เว็บ):** Dispatch board แบบคัมบัง, มอบหมายไรเดอร์, ออเดอร์ยอดถุงไม่ตรง, ตรวจสลิป, ตัดยอดถุง, จัดการสินค้า/ราคา/ผู้ใช้, ดู audit trail
- **B5:** endpoint จัดการสินค้าและผู้ใช้ (ตอนนี้ต้องแก้ใน DB/seed), PDPA ขอลบ/ขอสำเนาข้อมูล

### เฟส 2 (หลังใช้งานจริง)

สั่งประจำ, ตรวจสลิปอัตโนมัติ, จัดเส้นทาง, Dashboard, เชื่อม Lalamove/Grab (Adapter `DeliveryProvider` ตามเอกสารออกแบบ, ออเดอร์ที่มีถุงคืนต้องใช้ไรเดอร์ร้านเสมอ)

## 6. คำสั่งเริ่มงานสำหรับ Antigravity (คัดลอกไปใช้ได้)

**ตรวจระบบก่อนเริ่ม**
> อ่าน AGENTS.md และ docs/HANDOFF.md แล้วเปิดฐานข้อมูลด้วย `docker compose up -d db` รัน `npm run setup` และ `npm test` รายงานผล ถ้ามีเทสต์ไม่ผ่านให้หาสาเหตุก่อน ห้ามแก้เทสต์ให้ผ่านโดยไม่เข้าใจ

**เริ่มสปรินต์ 2**
> ทำงาน B1 ตาม docs/HANDOFF.md ส่วนที่ 5 รักษากฎใน AGENTS.md ทุกข้อ วางแผนก่อนแก้โค้ด เขียน e2e test ตามเงื่อนไข "เสร็จเมื่อ" แล้วรัน typecheck + test ให้ผ่าน commit แยกงาน แล้วอัปเดตสถานะใน HANDOFF.md ทำต่อ B2 และ B3 ด้วยวิธีเดียวกัน

**หน้าไรเดอร์**
> ทำงาน F1 ตาม docs/HANDOFF.md โดยดูดีไซน์จาก ../mockups/RiderJobs.dc.html และ RiderPOD.dc.html (เป็น HTML ธรรมดา อ่าน layout และข้อความได้) ใช้ API ที่มีอยู่ ห้ามแก้ state machine ฝั่ง backend เพื่อให้ frontend ง่ายขึ้น ถ้าต้องการ endpoint เพิ่มให้เสนอก่อน

## 7. ข้อควรระวังเวลาสั่ง agent

- งานที่แตะ `order-state-machine.ts`, `bag-ledger.service.ts` หรือ migration ให้ขอดูแผนก่อนอนุมัติ
- ถ้า agent เสนอให้ "ลบ trigger" "เก็บยอดถุงเป็นคอลัมน์" หรือ "รับ role จาก client" = ผิดหลักการ ให้ปฏิเสธ
- ให้ agent รันเทสต์เองทุกครั้งก่อนบอกว่าเสร็จ และดูว่าจำนวนเทสต์ไม่ลดลง (ตอนนี้ 26)
- ค่าใน `.env.production` บน VPS (รหัสผ่าน DB, `DEV_AUTH_KEY`, LINE token) ห้ามวางในแชตกับ agent
