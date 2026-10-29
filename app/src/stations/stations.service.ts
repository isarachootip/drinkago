import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, SQL, sql } from 'drizzle-orm';
import { DomainError } from '../common/errors';
import { Db, DB, DbOrTx } from '../db/db';
import { orders, stationBagLedger, users, waterStations } from '../db/schema';
import { inferStationRegion, StationRegion } from './station-regions';

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

@Injectable()
export class StationsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async bagBalance(stationId: number, tx: DbOrTx = this.db): Promise<number> {
    const [{ bal }] = await tx
      .select({ bal: sql<number>`coalesce(sum(${stationBagLedger.qty}), 0)::int` })
      .from(stationBagLedger)
      .where(eq(stationBagLedger.stationId, stationId));
    return bal;
  }

  async listStations(filter?: { region?: StationRegion; activeOnly?: boolean }) {
    const conds: SQL[] = [];
    if (filter?.region) conds.push(eq(waterStations.region, filter.region));
    if (filter?.activeOnly) conds.push(eq(waterStations.active, true));

    const query = this.db.select().from(waterStations);
    const stations = conds.length > 0
      ? await query.where(and(...conds)).orderBy(waterStations.id)
      : await query.orderBy(waterStations.id);

    const result = [];
    for (const s of stations) {
      result.push({ ...s, bagBalance: await this.bagBalance(s.id) });
    }
    return result;
  }

  /** คืนรายการตู้กดน้ำที่เปิดใช้งาน เรียงจากใกล้บ้านลูกค้าที่สุดไปไกลสุด พร้อมระยะทาง (กม.) */
  async suggestStations(lat: number, lng: number, tx: DbOrTx = this.db) {
    const activeStations = await tx.select().from(waterStations).where(eq(waterStations.active, true));
    const enriched = [];
    for (const st of activeStations) {
      const distanceKm = Number(haversineKm(lat, lng, st.lat, st.lng).toFixed(2));
      const bagBalance = await this.bagBalance(st.id, tx);
      enriched.push({ ...st, distanceKm, bagBalance });
    }
    enriched.sort((a, b) => a.distanceKm - b.distanceKm);
    return enriched;
  }

  /** คำนวณหาตู้กดน้ำที่เปิดใช้งานและอยู่ใกล้พิกัดบ้านลูกค้าที่สุด */
  async findNearestStation(lat: number, lng: number, tx: DbOrTx = this.db): Promise<number | null> {
    const sorted = await this.suggestStations(lat, lng, tx);
    return sorted[0]?.id ?? null;
  }

  async createStation(input: {
    code: string;
    name: string;
    addressDetail: string;
    region?: StationRegion;
    lat: number;
    lng: number;
  }) {
    const region = input.region ?? inferStationRegion(input.name, input.addressDetail);
    const [st] = await this.db
      .insert(waterStations)
      .values({ ...input, region })
      .onConflictDoNothing()
      .returning();
    if (!st) throw new DomainError(409, 'STATION_CODE_EXISTS', 'รหัสตู้กดน้ำนี้มีอยู่แล้ว');
    return { ...st, bagBalance: 0 };
  }

  async updateStation(
    id: number,
    input: Partial<{ name: string; addressDetail: string; region: StationRegion; lat: number; lng: number; active: boolean }>,
  ) {
    const [st] = await this.db
      .update(waterStations)
      .set(input)
      .where(eq(waterStations.id, id))
      .returning();
    if (!st) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบตู้กดน้ำ');
    return { ...st, bagBalance: await this.bagBalance(st.id) };
  }

  async recordMovement(
    tx: DbOrTx,
    input: {
      stationId: number;
      orderId?: string;
      customerId?: string;
      movement: 'RESTOCK_IN' | 'DISPENSED_OUT' | 'RETURNED_IN' | 'ADJUST';
      qty: number;
      actorId: string;
      note?: string;
    },
  ) {
    await tx.insert(stationBagLedger).values({
      stationId: input.stationId,
      orderId: input.orderId,
      customerId: input.customerId,
      movement: input.movement,
      qty: input.qty,
      actorId: input.actorId,
      note: input.note,
    });
  }

  async manualBagMovement(
    stationId: number,
    actorId: string,
    input: { movement: 'RESTOCK_IN' | 'ADJUST'; qty: number; note?: string },
  ) {
    const [st] = await this.db.select().from(waterStations).where(eq(waterStations.id, stationId));
    if (!st) throw new DomainError(404, 'NOT_FOUND', 'ไม่พบตู้กดน้ำ');
    const signedQty = input.movement === 'RESTOCK_IN' ? Math.abs(input.qty) : input.qty;
    await this.recordMovement(this.db, {
      stationId,
      movement: input.movement,
      qty: signedQty,
      actorId,
      note: input.note,
    });
    return { stationId, bagBalance: await this.bagBalance(stationId) };
  }

  async ledgerOf(stationId: number) {
    return this.db
      .select({
        id: stationBagLedger.id,
        stationId: stationBagLedger.stationId,
        orderId: stationBagLedger.orderId,
        orderCode: orders.code,
        customerId: stationBagLedger.customerId,
        customerName: users.name,
        movement: stationBagLedger.movement,
        qty: stationBagLedger.qty,
        note: stationBagLedger.note,
        createdAt: stationBagLedger.createdAt,
      })
      .from(stationBagLedger)
      .leftJoin(users, eq(users.id, stationBagLedger.customerId))
      .leftJoin(orders, eq(orders.id, stationBagLedger.orderId))
      .where(eq(stationBagLedger.stationId, stationId))
      .orderBy(desc(stationBagLedger.id))
      .limit(100);
  }
}
