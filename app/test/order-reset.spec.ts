import { clearAllOrders, INITIAL_STATION_BAGS, runOneTimeOrderReset } from '../src/orders/order-reset';
import { Db } from '../src/db/db';

function createMockDb(opts: {
  orderCount?: number;
  adminId?: string | null;
  stationIds?: number[];
  alreadyReset?: boolean;
}) {
  const executedSql: string[] = [];
  const insertedStationLedger: Array<Record<string, unknown>> = [];
  let resetRecorded = opts.alreadyReset ?? false;

  const db = {
    select: (fields?: Record<string, unknown>) => ({
      from: (_table: unknown) => {
        if (fields && 'cnt' in fields) {
          return Promise.resolve([{ cnt: opts.orderCount ?? 0 }]);
        }
        return {
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve(opts.adminId ? [{ id: opts.adminId, role: 'admin' }] : []),
            }),
          }),
          then: (resolve: (val: unknown) => unknown) =>
            Promise.resolve((opts.stationIds ?? []).map((id) => ({ id }))).then(resolve),
        };
      },
    }),
    execute: jest.fn(async (query: { queryChunks?: unknown[] }) => {
      const raw = JSON.stringify(query);
      executedSql.push(raw);
      if (raw.includes('SELECT reset_key FROM system_resets')) {
        return { rows: resetRecorded ? [{ reset_key: 'test_key' }] : [] };
      }
      if (raw.includes('INSERT INTO system_resets')) {
        resetRecorded = true;
      }
      return { rows: [] };
    }),
    insert: () => ({
      values: (val: Record<string, unknown>) => {
        insertedStationLedger.push(val);
        return Promise.resolve();
      },
    }),
  } as unknown as Db;

  return { db, executedSql, insertedStationLedger };
}

describe('Order Reset & Clear Old Orders (order-reset)', () => {
  it('1. clearAllOrders: ล้างตารางออเดอร์ทั้งหมดด้วย TRUNCATE CASCADE และเติมสต็อกถุงตั้งต้น 50 ใบต่อตู้กดน้ำ', async () => {
    const { db, executedSql, insertedStationLedger } = createMockDb({
      orderCount: 12,
      adminId: 'admin-uuid-1',
      stationIds: [1, 2, 3],
    });

    const res = await clearAllOrders(db);
    expect(res).toEqual({ clearedOrders: 12, restockedStations: 3 });
    expect(executedSql.some((s) => s.includes('TRUNCATE TABLE'))).toBe(true);
    expect(insertedStationLedger).toHaveLength(3);
    expect(insertedStationLedger[0]).toMatchObject({
      stationId: 1,
      movement: 'RESTOCK_IN',
      qty: INITIAL_STATION_BAGS,
      actorId: 'admin-uuid-1',
    });
  });

  it('2. runOneTimeOrderReset: รันล้างออเดอร์เก่าเพียงครั้งเดียวต่อ resetKey เพื่อไม่ให้ลบออเดอร์ใหม่เมื่อรีสตาร์ทเซิร์ฟเวอร์', async () => {
    const { db, insertedStationLedger } = createMockDb({
      orderCount: 5,
      adminId: 'admin-uuid-1',
      stationIds: [10, 20],
      alreadyReset: false,
    });

    const first = await runOneTimeOrderReset(db, 'clear_orders_test_v1');
    expect(first).toEqual({ executed: true, clearedOrders: 5, restockedStations: 2 });
    expect(insertedStationLedger).toHaveLength(2);

    const second = await runOneTimeOrderReset(db, 'clear_orders_test_v1');
    expect(second).toEqual({ executed: false, clearedOrders: 0, restockedStations: 0 });
    expect(insertedStationLedger).toHaveLength(2);
  });
});
