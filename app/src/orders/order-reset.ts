import { asc, eq, sql } from 'drizzle-orm';
import { Db } from '../db/db';
import { orders, stationBagLedger, users, waterStations } from '../db/schema';

export const INITIAL_STATION_BAGS = 50;
export const DEFAULT_ORDER_RESET_KEY = 'clear_orders_2026_10_29_v1';

export interface ClearOrdersResult {
  clearedOrders: number;
  restockedStations: number;
}

export interface OneTimeResetResult extends ClearOrdersResult {
  executed: boolean;
}

/**
 * ล้างข้อมูลออเดอร์เก่า ประวัติสถานะ ถุงค้าง สลิปค้าง และตะกร้าแชททั้งหมดด้วย TRUNCATE CASCADE
 * (ไม่แตะต้อง trigger append-only และไม่ลบข้อมูลผู้ใช้ ที่อยู่ สินค้า หรือตู้กดน้ำ)
 * จากนั้นเติมสต็อกถุงตั้งต้นประจำตู้กดน้ำใหม่ตู้ละ 50 ใบพร้อมสำหรับการทดสอบรอบใหม่
 */
export async function clearAllOrders(db: Db): Promise<ClearOrdersResult> {
  const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` }).from(orders);

  await db.execute(sql`
    TRUNCATE TABLE
      order_items,
      order_events,
      bag_ledger,
      station_bag_ledger,
      payments,
      notification_outbox,
      line_cart_sessions,
      idempotency_keys,
      orders
    RESTART IDENTITY CASCADE
  `);

  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.role, 'admin'))
    .orderBy(asc(users.createdAt))
    .limit(1);

  const stations = await db.select().from(waterStations);
  let restockedStations = 0;

  if (admin) {
    for (const st of stations) {
      await db.insert(stationBagLedger).values({
        stationId: st.id,
        movement: 'RESTOCK_IN',
        qty: INITIAL_STATION_BAGS,
        actorId: admin.id,
        note: 'สต็อกถุงตั้งต้นประจำตู้กดน้ำ (รีเซ็ตเริ่มทดสอบใหม่)',
      });
      restockedStations += 1;
    }
  }

  return { clearedOrders: cnt, restockedStations };
}

/**
 * รันล้างออเดอร์เก่าอัตโนมัติเพียงครั้งเดียวต่อ resetKey
 * เพื่อให้ทั้งเครื่องพัฒนาและ Production (Coolify) ล้างออเดอร์เก่าทันทีที่อัปเดตโดยไม่ลบออเดอร์ใหม่เมื่อรีสตาร์ทครั้งถัดไป
 */
export async function runOneTimeOrderReset(
  db: Db,
  resetKey = DEFAULT_ORDER_RESET_KEY,
): Promise<OneTimeResetResult> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS system_resets (
      reset_key TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const existing = await db.execute<{ reset_key: string }>(
    sql`SELECT reset_key FROM system_resets WHERE reset_key = ${resetKey} LIMIT 1`,
  );
  if (existing.rows.length > 0) {
    return { executed: false, clearedOrders: 0, restockedStations: 0 };
  }

  const res = await clearAllOrders(db);
  await db.execute(sql`
    INSERT INTO system_resets (reset_key, executed_at)
    VALUES (${resetKey}, now())
    ON CONFLICT (reset_key) DO NOTHING
  `);

  return { executed: true, ...res };
}
