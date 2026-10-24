# Drink&Go — ระบบขายน้ำผ่าน LINE + Delivery

## เอกสารออกแบบระบบ (แก้ไขออนไลน์ได้)
https://claude.ai/code/artifact/dfbfda1e-743e-4988-bab0-70e8a1f35470
- ภาพรวม, บทบาทผู้ใช้, Functional Requirements (FR-C/W/R/A)
- Order State Machine, สถาปัตยกรรมระบบ, ER Diagram, Sequence Diagram
- การเชื่อม LINE, Delivery Service ภายนอก, NFR, แผนเฟส, คำถามที่ต้องตัดสินใจ

## Mockup หน้าจอ LIFF (canvas)
https://claude.ai/artifact/SWXqx4R9MGi6m5ti7U3Vm5

ไฟล์ต้นฉบับในโฟลเดอร์ mockups/ (รูปแบบ .dc.html ของ canvas):
| ไฟล์ | หน้าจอ |
| --- | --- |
| Main.dc.html | ลูกค้า: สั่งซื้อ / สั่งซ้ำ / ระบุถุงคืน |
| Track.dc.html | ลูกค้า: ติดตามออเดอร์ + ยอดถุงค้าง |
| RiderJobs.dc.html | ไรเดอร์: งานวันนี้ เรียงตามเส้นทาง |
| RiderPOD.dc.html | ไรเดอร์: ยืนยันส่ง (รูป + GPS + OTP) และรับถุงคืน |

ช่องในวงเล็บเหลี่ยม เช่น [ราคา] [ที่อยู่ลูกค้า] คือข้อมูลจริงที่ต้องใส่ภายหลัง
