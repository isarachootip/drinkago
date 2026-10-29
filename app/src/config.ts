import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('postgres://drinkgo:drinkgo@localhost:5433/drinkgo'),
  /** dev = ยืนยันตัวตนด้วย header x-dev-user (ห้ามใช้ใน production), line = LINE ID token */
  AUTH_MODE: z.enum(['dev', 'line']).default('dev'),
  /**
   * ใช้ dev auth บนเซิร์ฟเวอร์จริงได้เฉพาะเมื่อตั้งรหัสนี้ (อย่างน้อย 24 ตัว)
   * ทุกคำขอต้องส่ง header x-dev-key ตรงกัน มิฉะนั้นใครก็สวมรอยเป็นแอดมินได้
   */
  DEV_AUTH_KEY: z.string().optional(),
  LINE_LOGIN_CHANNEL_ID: z.string().optional(),
  LINE_CHANNEL_SECRET: z.string().optional(),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().optional(),
  /** บังคับให้ไรเดอร์กรอกรหัส 4 หลักจากลูกค้าตอนส่ง */
  REQUIRE_DELIVERY_OTP: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
  NOTIFY_DISPATCH_INTERVAL_MS: z.coerce.number().default(3000),
  /** โฟลเดอร์จัดเก็บไฟล์อัปโหลด */
  UPLOAD_DIR: z.string().default('./uploads'),
  /** Base URL สำหรับเข้าถึงรูปภาพที่อัปโหลด */
  PUBLIC_UPLOAD_BASE_URL: z.string().default('http://localhost:3000/uploads'),
  /** โดเมนที่อนุญาตให้เรียก API ผ่าน CORS (คั่นด้วยจุลภาค หรือ * สำหรับทุกโดเมน) */
  CORS_ORIGINS: z.string().default('*'),
  /** URL หน้าเว็บหลักสำหรับส่งลิงก์ให้ลูกค้าในแชท LINE */
  PUBLIC_WEB_URL: z.string().default('https://idrink.tamadee.online'),
  /** LINE Official Account ID (@...) */
  LINE_OA_BASIC_ID: z.string().default('@157iywjs'),
  /** ลิงก์เพจ Facebook สำหรับปุ่ม "เยี่ยมชมเรา" บน Rich Menu */
  FACEBOOK_PAGE_URL: z.string().default('https://www.facebook.com'),
  /** เบอร์โทรศัพท์หรือเลขบัตรประชาชนสำหรับสร้าง PromptPay QR Code */
  PROMPTPAY_ID: z.string().default('0812345678'),
  /** ชื่อบัญชี PromptPay สำหรับแสดงในใบสรุปคำสั่งซื้อ */
  PROMPTPAY_ACCOUNT_NAME: z.string().default('บจก. ดริ้งค์ แอนด์ โก'),
});

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const cfg = schema.parse(env);
  if (cfg.NODE_ENV === 'production' && cfg.AUTH_MODE === 'dev' && (cfg.DEV_AUTH_KEY ?? '').length < 24) {
    throw new Error('AUTH_MODE=dev บนเซิร์ฟเวอร์ต้องตั้ง DEV_AUTH_KEY อย่างน้อย 24 ตัวอักษร');
  }
  if (cfg.AUTH_MODE === 'line' && !cfg.LINE_LOGIN_CHANNEL_ID) {
    throw new Error('AUTH_MODE=line ต้องตั้งค่า LINE_LOGIN_CHANNEL_ID');
  }
  return cfg;
}

export const APP_CONFIG = Symbol('APP_CONFIG');
