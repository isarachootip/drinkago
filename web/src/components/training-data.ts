export type TrainingRole = 'customer' | 'rider' | 'admin';

export interface SummaryCardItem {
  badge: string;
  title: string;
  desc: string;
  accent: string;
}

export interface RoleStepItem {
  step: number;
  title: string;
  statusBadge?: string;
  detail: string;
}

export interface TrainingQaItem {
  id: string;
  role: TrainingRole | 'all';
  question: string;
  answer: string;
  keywords: string[];
}

export const KM_SUMMARY_CARDS: SummaryCardItem[] = [
  {
    badge: 'LINE Flex Ordering',
    title: 'Delivery Only + PromptPay',
    desc: 'สั่งน้ำผ่านแชท LINE OA (@157iywjs) พร้อมตะกร้า Interactive และ QR Code ยอดเงินอัตโนมัติ',
    accent: '#0369A1',
  },
  {
    badge: 'Smart Station Suggest',
    title: 'ตู้กดน้ำ 15 สาขาทั่วไทย',
    desc: 'คำนวณระยะทาง Haversine จาก GPS ลูกค้า แนะนำตู้ใกล้สุด (10 เขต กทม. + 5 จังหวัดใหญ่)',
    accent: '#059669',
  },
  {
    badge: 'Direct Rider Flow',
    title: 'ไม่ต้องผ่านคลัง (No Warehouse)',
    desc: 'ออเดอร์เป็น CONFIRMED ทันที ไรเดอร์กดรับงานเอง (Claim) ไปกดน้ำที่ตู้และวิ่งส่งถึงบ้าน',
    accent: '#1D4ED8',
  },
  {
    badge: 'Append-Only Bag Ledger',
    title: 'บัญชีถุง & ปิดงานอัตโนมัติ',
    desc: 'ตัดสต็อกถุงตู้ตอนกดน้ำ และบวกถุงคืนเข้าตู้พร้อมปิดงาน CLOSED_WITH_RETURN ทันทีเมื่อส่งสำเร็จ',
    accent: '#0F172A',
  },
];

export const ROLE_TRAINING_STEPS: Record<TrainingRole, RoleStepItem[]> = {
  customer: [
    {
      step: 1,
      title: 'เปิดเมนูสินค้า (LINE Flex Menu หรือหน้าเว็บ)',
      detail: 'พิมพ์ "เมนู" หรือกดปุ่มสั่งน้ำดื่มใน LINE OA (@157iywjs) เพื่อเปิดการ์ดสินค้าแบบ Carousel แล้วกดเพิ่มสินค้าลงตะกร้า (+ / -)',
    },
    {
      step: 2,
      title: 'ระบุที่อยู่จัดส่ง & แชร์พิกัด GPS',
      detail: 'กดยืนยันตะกร้า เลือกใช้ที่อยู่เดิมหรือพิมพ์ที่อยู่ใหม่ แล้วกดปุ่มแชร์โลเคชัน (GPS) เพื่อให้ระบบคำนวณระยะทาง',
    },
    {
      step: 3,
      title: 'ยืนยันตู้กดน้ำที่ใกล้บ้านที่สุด (Suggested Station)',
      detail: 'ระบบแนะนำตู้กดน้ำที่ใกล้พิกัดบ้านที่สุด (จาก 15 สาขา) พร้อมแสดงระยะทาง (กม.) ลูกค้ากดยืนยันตู้ที่แนะนำหรือเลือกสาขาอื่นได้',
    },
    {
      step: 4,
      title: 'แจ้งจำนวนถุงคืน & เลือกวิธีชำระเงิน',
      statusBadge: 'CONFIRMED',
      detail: 'หากมีถุงค้าง ระบบจะถามจำนวนถุงที่จะฝากคืนไรเดอร์ จากนั้นเลือกชำระด้วย PromptPay QR (แนบสลิปในแชท) หรือ เงินสด/เครดิต ระบบออกตั๋วออเดอร์พร้อมรหัส OTP 4 หลักทันที',
    },
    {
      step: 5,
      title: 'แจ้งรหัส OTP 4 หลักแก่ไรเดอร์ & คืนถุงเปล่า',
      statusBadge: 'DELIVERED / CLOSED_WITH_RETURN',
      detail: 'เมื่อไรเดอร์มาส่งน้ำที่หน้าบ้าน ให้บอกรหัส OTP 4 หลัก (ดูได้ในตั๋ว LINE หรือหน้าติดตามสถานะ) และส่งมอบถุงเปล่าคืนไรเดอร์',
    },
  ],
  rider: [
    {
      step: 1,
      title: 'เข้าสู่ระบบไรเดอร์ & ดูคิวงานกลาง (/rider/jobs)',
      statusBadge: 'CONFIRMED',
      detail: 'ล็อกอินด้วยบัญชีไรเดอร์ (เช่น rider / rider1234) ระบบจะแสดงเฉพาะหน้างานไรเดอร์ พร้อมรายการออเดอร์ใหม่ที่รอรับงาน',
    },
    {
      step: 2,
      title: 'กดรับงานด้วยตนเอง (Self-Claim)',
      statusBadge: 'CONFIRMED (Assigned)',
      detail: 'กดปุ่ม "รับงานนี้" บนออเดอร์ที่ต้องการ ระบบผูกชื่อไรเดอร์เข้ากับออเดอร์ทันทีโดยไม่ต้องรอคลังสินค้ามอบหมาย',
    },
    {
      step: 3,
      title: 'เดินทางไปตู้กดน้ำสาขาที่ระบุ & กดน้ำบรรจุถุง',
      statusBadge: 'PACKED',
      detail: 'ดูชื่อสาขาตู้กดน้ำบนการ์ดงาน (หรือกดนำทาง Google Maps ไปที่ตู้) เมื่อกดน้ำเสร็จให้กดปุ่ม "กดน้ำเสร็จ" ระบบจะตัดสต็อกถุงของตู้นั้น (DISPENSED_OUT) อัตโนมัติ',
    },
    {
      step: 4,
      title: 'ถ่ายรูปรับน้ำขึ้นรถ + พิกัด GPS & เริ่มออกเดินทาง',
      statusBadge: 'PICKED_UP → OUT_FOR_DELIVERY',
      detail: 'ถ่ายรูปหลักฐานรับน้ำที่ตู้พร้อมพิกัด GPS (ขั้นที่ 4 PICKED_UP) แล้วกด "เริ่มออกเดินทาง" (ขั้นที่ 5 OUT_FOR_DELIVERY) เพื่อแจ้งเตือน LINE ลูกค้า',
    },
    {
      step: 5,
      title: 'ส่งมอบน้ำด้วย OTP 4 หลัก + ถ่ายรูป POD + รับถุงคืนเข้าตู้',
      statusBadge: 'DELIVERED / CLOSED_WITH_RETURN',
      detail: 'เมื่อถึงบ้านลูกค้า ให้ขอรหัส OTP 4 หลัก ถ่ายรูปหน้างาน และกรอกจำนวนถุงเปล่าที่รับคืน ระบบจะตัดบัญชีถุงลูกค้า บวกถุงกลับเข้าตู้ (RETURNED_IN) และปิดงานเป็น CLOSED_WITH_RETURN ทันที',
    },
  ],
  admin: [
    {
      step: 1,
      title: 'จัดการผู้ใช้งานและสิทธิ์ตามบทบาท (Users CRUD)',
      detail: 'สร้าง/แก้ไขบัญชี Admin, Rider, Customer และตั้งรหัสผ่านสำหรับเข้าใช้งานหน้าเว็บ ระบบบังคับแยกหน้าจอตามบทบาท (Role-Based Access)',
    },
    {
      step: 2,
      title: 'บริหารสินค้า รูปภาพเมนู & ซิงก์ LINE Rich Menu',
      detail: 'อัปโหลดรูปสินค้า ตั้งราคา (สตางค์) กำหนดสินค้ามีถุงคืน (isReturnable) และกดซิงก์ Rich Menu 6 ปุ่มขึ้น LINE OA ได้ในคลิกเดียว',
    },
    {
      step: 3,
      title: 'บริหารตู้กดน้ำ 15 สาขา & สต็อกถุงประจำตู้ (Stations)',
      detail: 'ตรวจสอบพิกัด GPS ของทั้ง 15 สาขา (10 เขต กทม. รวมรามอินทรา 57, พุทธบูชา 34 + 5 จังหวัดใหญ่) เติมสต็อกถุง (RESTOCK_IN) และดูประวัติเข้า-ออกรายตู้',
    },
    {
      step: 4,
      title: 'ตรวจสอบสลิปโอนเงิน & จัดการวงเงินเครดิตลูกค้า',
      detail: 'เมื่อลูกค้าส่งสลิปในแชท LINE สถานะชำระเงินจะเป็น PENDING_VERIFY แอดมินกด "อนุมัติสลิป" เพื่อเปลี่ยนเป็น PAID หรือตั้งวงเงินเครดิตลูกค้าประจำ',
    },
    {
      step: 5,
      title: 'ปลดล็อก OTP & ตรวจสอบ Audit Trail ย้อนหลัง',
      detail: 'หากไรเดอร์กรอก OTP ผิดเกิน 5 ครั้ง ระบบจะล็อกเพื่อความปลอดภัย แอดมินสามารถกด "ปลดล็อก OTP", นัดส่งใหม่ หรือดู Audit Trail ทุกขั้นตอนพร้อมรูปและพิกัด GPS',
    },
  ],
};

export const TRAINING_QA_LIST: TrainingQaItem[] = [
  {
    id: 'qa-line-order',
    role: 'customer',
    question: 'ลูกค้าสั่งน้ำผ่านแชท LINE และเลือกตู้กดน้ำใกล้บ้านอย่างไร?',
    answer: 'พิมพ์ "เมนู" ใน LINE OA (@157iywjs) → กดเพิ่มสินค้าลงตะกร้า → กดยืนยันสั่งซื้อ → แชร์พิกัด GPS → ระบบจะคำนวณและแสดงปุ่มตู้กดน้ำสาขาที่ใกล้บ้านที่สุดให้กดยืนยันได้ทันที',
    keywords: ['line', 'เมนู', 'สั่งน้ำ', 'ตู้ใกล้สุด', 'gps', 'ลูกค้า'],
  },
  {
    id: 'qa-rider-claim',
    role: 'rider',
    question: 'ทำไมไม่มีขั้นตอนคลังสินค้า (Warehouse) แล้วไรเดอร์ต้องทำอย่างไร?',
    answer: 'ระบบใช้แนวทาง Direct Rider Flow: ทันทีที่ลูกค้าสั่งเสร็จ ออเดอร์จะเป็นสถานะ CONFIRMED ทันที ไรเดอร์เปิดหน้า "งานจัดส่งวันนี้" แล้วกดปุ่ม "รับงานนี้ (Claim)" จากนั้นขับไปกดน้ำที่ตู้สาขาที่ระบุบนใบงานได้เลย',
    keywords: ['คลัง', 'warehouse', 'claim', 'รับงาน', 'ไรเดอร์', 'กดน้ำ'],
  },
  {
    id: 'qa-bag-return',
    role: 'rider',
    question: 'เมื่อไรเดอร์รับถุงเปล่าคืนจากลูกค้า ต้องเอากลับไปส่งคลังอีกไหม?',
    answer: 'ไม่ต้องผ่านคลังแล้ว เมื่อไรเดอร์กรอกจำนวนถุงที่รับคืนพร้อมถ่ายรูปหลักฐานตอนส่งน้ำ (Deliver) ระบบจะบวกสต็อกถุงกลับเข้าตู้กดน้ำ (RETURNED_IN) หักยอดถุงค้างของลูกค้า และปิดงานเป็น CLOSED_WITH_RETURN อัตโนมัติทันที',
    keywords: ['ถุงคืน', 'ถุงเปล่า', 'สต็อกถุง', 'closed_with_return', 'รับถุง'],
  },
  {
    id: 'qa-otp-lock',
    role: 'admin',
    question: 'กรอกรหัส OTP ส่งน้ำผิดครบ 5 ครั้งจนถูกล็อก ต้องแก้ไขอย่างไร?',
    answer: 'เพื่อป้องกันการเดารหัส ระบบจะล็อกออเดอร์เมื่อกรอก OTP ผิด 5 ครั้ง ให้แจ้งแอดมินไปที่แท็บ "ออเดอร์" แล้วกดปุ่ม "ปลดล็อก OTP" ของออเดอร์นั้น จากนั้นไรเดอร์จะกรอก OTP ใหม่ได้',
    keywords: ['otp', 'ล็อก', 'ผิด 5 ครั้ง', 'unlock', 'รหัสส่งมอบ'],
  },
  {
    id: 'qa-slip-verify',
    role: 'admin',
    question: 'ลูกค้าโอนเงิน PromptPay และส่งรูปสลิปใน LINE แล้ว ตรวจที่ไหน?',
    answer: 'เมื่อลูกค้าส่งรูปสลิปในแชท LINE ระบบจะบันทึกภาพและเปลี่ยนสถานะการชำระเงินเป็น PENDING_VERIFY แอดมินสามารถไปที่แท็บ "ออเดอร์" แล้วกดปุ่ม "อนุมัติสลิป" เพื่อเปลี่ยนสถานะเป็น PAID',
    keywords: ['สลิป', 'promptpay', 'โอนเงิน', 'paid', 'pending_verify'],
  },
];
