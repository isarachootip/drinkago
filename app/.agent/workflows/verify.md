---
description: ตรวจว่าโค้ดพร้อม commit (typecheck + เทสต์ทั้งหมด)
---

1. ตรวจว่า Docker ตอบสนอง: `docker version` ถ้าไม่ตอบ ให้หยุดและบอกผู้ใช้เปิด Docker Desktop
2. `docker compose up -d db`
3. `npm run typecheck`
4. `npm test`
5. รายงานจำนวนเทสต์ที่ผ่าน/ไม่ผ่าน เทียบกับจำนวนเดิมใน docs/HANDOFF.md (ห้ามน้อยลง)
6. ถ้าไม่ผ่าน ให้อธิบายสาเหตุก่อนแก้ ห้ามแก้เทสต์ให้ผ่านโดยไม่เข้าใจ
