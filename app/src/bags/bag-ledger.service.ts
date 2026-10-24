import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DomainError } from '../common/errors';
import { Db, DB, DbOrTx } from '../db/db';
import { bagLedger, orders } from '../db/schema';

/**
 * บัญชีถุง: บันทึกเป็นรายการเคลื่อนไหว ไม่เก็บยอดแบบเขียนทับ
 * ISSUED +N (ส่งน้ำพร้อมถุง) · COLLECTED −N (ไรเดอร์รับคืน) · RECEIVED 0 + counted (คลังนับ) · WRITTEN_OFF −N (แอดมินตัดยอด)
 */
@Injectable()
export class BagLedgerService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async balance(customerId: string, tx: DbOrTx = this.db): Promise<number> {
    const [row] = await tx
      .select({ total: sql<number>`coalesce(sum(${bagLedger.qty}), 0)::int` })
      .from(bagLedger)
      .where(eq(bagLedger.customerId, customerId));
    return row.total;
  }

  async history(customerId: string, limit = 50) {
    return this.db
      .select({
        id: bagLedger.id,
        movement: bagLedger.movement,
        qty: bagLedger.qty,
        counted: bagLedger.counted,
        orderCode: orders.code,
        createdAt: bagLedger.createdAt,
      })
      .from(bagLedger)
      .leftJoin(orders, eq(orders.id, bagLedger.orderId))
      .where(eq(bagLedger.customerId, customerId))
      .orderBy(desc(bagLedger.id))
      .limit(limit);
  }

  async issue(tx: DbOrTx, p: { customerId: string; orderId: string; qty: number; by: string }) {
    if (p.qty <= 0) return;
    await tx.insert(bagLedger).values({ customerId: p.customerId, orderId: p.orderId, movement: 'ISSUED', qty: p.qty, confirmedBy: p.by });
  }

  /** ขั้น 7: ไรเดอร์รับถุงคืน ห้ามเกินยอดค้างของลูกค้า */
  async collect(tx: DbOrTx, p: { customerId: string; orderId: string; qty: number; by: string }) {
    if (!Number.isInteger(p.qty) || p.qty <= 0) throw new DomainError(400, 'BAD_QTY', 'จำนวนถุงต้องเป็นจำนวนเต็มบวก');
    const bal = await this.balance(p.customerId, tx);
    if (p.qty > bal) {
      throw new DomainError(422, 'BAGS_EXCEED_BALANCE', `ลูกค้ามีถุงค้าง ${bal} ใบ รับคืน ${p.qty} ใบไม่ได้`);
    }
    await tx.insert(bagLedger).values({ customerId: p.customerId, orderId: p.orderId, movement: 'COLLECTED', qty: -p.qty, confirmedBy: p.by });
  }

  /** ขั้น 8: คลังนับถุงจริง ไม่กระทบยอดลูกค้า คืนค่า true ถ้ายอดตรงกับที่ไรเดอร์รับ */
  async receive(tx: DbOrTx, p: { customerId: string; orderId: string; counted: number; by: string }): Promise<{ match: boolean; collected: number }> {
    if (!Number.isInteger(p.counted) || p.counted < 0) throw new DomainError(400, 'BAD_QTY', 'จำนวนที่นับต้องเป็นจำนวนเต็มไม่ติดลบ');
    const collected = await this.collectedForOrder(p.orderId, tx);
    await tx.insert(bagLedger).values({ customerId: p.customerId, orderId: p.orderId, movement: 'RECEIVED', qty: 0, counted: p.counted, confirmedBy: p.by });
    return { match: collected === p.counted, collected };
  }

  async writeOff(tx: DbOrTx, p: { customerId: string; qty: number; by: string; note: string; orderId?: string }) {
    if (!Number.isInteger(p.qty) || p.qty <= 0) throw new DomainError(400, 'BAD_QTY', 'จำนวนถุงต้องเป็นจำนวนเต็มบวก');
    await tx.insert(bagLedger).values({ customerId: p.customerId, orderId: p.orderId, movement: 'WRITTEN_OFF', qty: -p.qty, confirmedBy: p.by, note: p.note });
  }

  async collectedForOrder(orderId: string, tx: DbOrTx = this.db): Promise<number> {
    const [row] = await tx
      .select({ total: sql<number>`coalesce(-sum(${bagLedger.qty}), 0)::int` })
      .from(bagLedger)
      .where(and(eq(bagLedger.orderId, orderId), eq(bagLedger.movement, 'COLLECTED')));
    return row.total;
  }
}
