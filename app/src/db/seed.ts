import 'dotenv/config';
/**
 * ข้อมูลตั้งต้นสำหรับพัฒนาและทดสอบ (ราคาเป็นค่าตัวอย่าง แก้ได้ใน Back Office ภายหลัง)
 * ผู้ใช้ทดสอบเข้าระบบด้วย header x-dev-user: <lineUserId> ในโหมด AUTH_MODE=dev
 */
import { eq, sql } from 'drizzle-orm';
import { hashPassword } from '../common/password';
import { createDb } from './db';
import { products, stationBagLedger, users, waterStations } from './schema';

export const DEV_USERS = [
  { lineUserId: 'dev-admin', username: 'admin', passwordHash: hashPassword('admin1234'), role: 'admin' as const, name: 'แอดมินทดสอบ' },
  { lineUserId: 'dev-warehouse', username: 'warehouse', passwordHash: hashPassword('warehouse1234'), role: 'warehouse' as const, name: 'คลังทดสอบ' },
  { lineUserId: 'dev-rider', role: 'rider' as const, name: 'ไรเดอร์ทดสอบ', vehicle: 'มอเตอร์ไซค์ กข-1234', zone: 'A' },
  { lineUserId: 'dev-rider-2', role: 'rider' as const, name: 'ไรเดอร์ทดสอบ 2', vehicle: 'มอเตอร์ไซค์ ขค-5678', zone: 'B' },
];

export const SAMPLE_PRODUCTS = [
  {
    sku: 'WATER-TANK-18L',
    name: 'น้ำดื่มแบบถัง',
    priceSatang: 6000,
    isReturnable: true,
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=600&q=80',
  },
  {
    sku: 'WATER-PACK-12',
    name: 'น้ำดื่มแบบแพ็ก',
    priceSatang: 5500,
    isReturnable: false,
    imageUrl: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=600&q=80',
  },
];

export const SAMPLE_STATIONS = [
  {
    code: 'ST-01',
    name: 'ตู้กดน้ำสาขาสุขุมวิท 50 (จุดหลัก)',
    addressDetail: 'ปากซอยสุขุมวิท 50 แขวงพระโขนง เขตคลองเตย',
    lat: 13.7058,
    lng: 100.6012,
  },
  {
    code: 'ST-02',
    name: 'ตู้กดน้ำสาขาอ่อนนุช 17',
    addressDetail: 'ซอยอ่อนนุช 17 แขวงสวนหลวง เขตสวนหลวง',
    lat: 13.7135,
    lng: 100.6105,
  },
];

export async function seed(url: string) {
  const { db, pool } = createDb(url);
  try {
    await db.insert(users).values(DEV_USERS).onConflictDoNothing();
    await db.insert(products).values(SAMPLE_PRODUCTS).onConflictDoNothing();
    for (const sp of SAMPLE_PRODUCTS) {
      const [existing] = await db.select().from(products).where(eq(products.sku, sp.sku)).limit(1);
      if (existing && !existing.imageUrl) {
        await db.update(products).set({ imageUrl: sp.imageUrl }).where(eq(products.id, existing.id));
      }
    }
    await db.insert(waterStations).values(SAMPLE_STATIONS).onConflictDoNothing();

    const [admin] = await db.select().from(users).where(eq(users.lineUserId, 'dev-admin')).limit(1);
    if (admin && !admin.username) {
      await db.update(users).set({ username: 'admin', passwordHash: hashPassword('admin1234') }).where(eq(users.id, admin.id));
    }
    const [wh] = await db.select().from(users).where(eq(users.lineUserId, 'dev-warehouse')).limit(1);
    if (wh && !wh.username) {
      await db.update(users).set({ username: 'warehouse', passwordHash: hashPassword('warehouse1234') }).where(eq(users.id, wh.id));
    }
    const stations = await db.select().from(waterStations);
    if (admin) {
      for (const st of stations) {
        const [{ n }] = await db
          .select({ n: sql<number>`coalesce(sum(${stationBagLedger.qty}), 0)::int` })
          .from(stationBagLedger)
          .where(eq(stationBagLedger.stationId, st.id));
        if (n === 0) {
          await db.insert(stationBagLedger).values({
            stationId: st.id,
            movement: 'RESTOCK_IN',
            qty: 50,
            actorId: admin.id,
            note: 'สต็อกถุงตั้งต้นประจำตู้กดน้ำ',
          });
        }
      }
    }
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
