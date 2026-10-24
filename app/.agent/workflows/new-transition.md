---
description: เพิ่มสถานะหรือเส้นทางใหม่ใน Order state machine อย่างปลอดภัย
---

1. อ่าน AGENTS.md ข้อ 1–3 และ src/orders/order-state-machine.ts
2. เสนอแผนให้ผู้ใช้อนุมัติก่อน: from → to, บทบาทที่ทำได้, ต้องมีหลักฐานหรือไม่, ผลต่อบัญชีถุง, แจ้งเตือนใคร
3. ถ้ามีสถานะใหม่: เพิ่มใน `orderStatusEnum` (src/db/schema.ts) และ type `OrderStatus` แล้ว `npm run db:generate`
4. เพิ่มกฎใน `TRANSITIONS` และเมธอดใน OrdersService ที่เรียก `withLockedOrder` + `transition()`
5. เพิ่ม endpoint ใน orders.controller.ts พร้อม @Roles
6. เทสต์: unit ใน test/state-machine.spec.ts และ e2e ทั้งทางสำเร็จและทางที่ถูกปฏิเสธ
7. อัปเดตตาราง API ใน README.md และสถานะใน docs/HANDOFF.md
8. รัน /verify
