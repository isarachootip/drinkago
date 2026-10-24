import 'dotenv/config';
/**
 * ข้อมูลตั้งต้นสำหรับพัฒนาและทดสอบ (ราคาเป็นค่าตัวอย่าง แก้ได้ใน Back Office ภายหลัง)
 * ผู้ใช้ทดสอบเข้าระบบด้วย header x-dev-user: <lineUserId> ในโหมด AUTH_MODE=dev
 */
import { createDb } from './db';
import { products, users } from './schema';

export const DEV_USERS = [
  { lineUserId: 'dev-admin', role: 'admin' as const, name: 'แอดมินทดสอบ' },
  { lineUserId: 'dev-warehouse', role: 'warehouse' as const, name: 'คลังทดสอบ' },
  { lineUserId: 'dev-rider', role: 'rider' as const, name: 'ไรเดอร์ทดสอบ', vehicle: 'มอเตอร์ไซค์', zone: 'A' },
  { lineUserId: 'dev-rider-2', role: 'rider' as const, name: 'ไรเดอร์ทดสอบ 2', vehicle: 'มอเตอร์ไซค์', zone: 'B' },
];

export const SAMPLE_PRODUCTS = [
  { sku: 'WATER-TANK-18L', name: 'น้ำดื่มแบบถัง', priceSatang: 6000, isReturnable: true },
  { sku: 'WATER-PACK-12', name: 'น้ำดื่มแบบแพ็ก', priceSatang: 5500, isReturnable: false },
];

export async function seed(url: string) {
  const { db, pool } = createDb(url);
  try {
    await db.insert(users).values(DEV_USERS).onConflictDoNothing();
    await db.insert(products).values(SAMPLE_PRODUCTS).onConflictDoNothing();
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seed(process.env.DATABASE_URL ?? 'postgres://drinkgo:drinkgo@localhost:5433/drinkgo')
    .then(() => console.log('seeded'))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
