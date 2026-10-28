import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { and, asc, eq, lt } from 'drizzle-orm';
import { APP_CONFIG, AppConfig } from '../config';
import { Db, DB, DbOrTx } from '../db/db';
import { notificationOutbox, users } from '../db/schema';

export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_CONFIRMED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'BAGS_COLLECTED'
  | 'ORDER_CANCELLED'
  | 'NEW_ORDER_FOR_WAREHOUSE'
  | 'NEW_ORDER_FOR_RIDERS'
  | 'JOB_ASSIGNED'
  | 'BAG_MISMATCH';

/** ข้อความภาษาไทยต่อประเภท (ต่อไปเปลี่ยนเป็น Flex Message ได้) */
export function renderText(type: NotificationType, p: Record<string, unknown>): string {
  switch (type) {
    case 'ORDER_PLACED':
      return `รับออเดอร์ ${p.code} แล้ว ยอดรวม ${p.total} บาท รหัสรับของของคุณคือ ${p.otp}`;
    case 'ORDER_CONFIRMED':
      return `ร้านรับออเดอร์ ${p.code} แล้ว กำลังจัดของ`;
    case 'OUT_FOR_DELIVERY':
      return `ไรเดอร์กำลังไปส่งออเดอร์ ${p.code}`;
    case 'DELIVERED':
      return `ส่งออเดอร์ ${p.code} สำเร็จ ถุงค้างของคุณตอนนี้ ${p.bagBalance} ใบ`;
    case 'DELIVERY_FAILED':
      return `ส่งออเดอร์ ${p.code} ไม่สำเร็จ (${p.reason}) ร้านจะติดต่อกลับเพื่อนัดส่งใหม่`;
    case 'BAGS_COLLECTED':
      return `ไรเดอร์รับถุงคืน ${p.qty} ใบแล้ว ถุงค้างของคุณตอนนี้ ${p.bagBalance} ใบ`;
    case 'ORDER_CANCELLED':
      return `ออเดอร์ ${p.code} ถูกยกเลิก`;
    case 'NEW_ORDER_FOR_WAREHOUSE':
      return `ออเดอร์ใหม่ ${p.code}`;
    case 'NEW_ORDER_FOR_RIDERS':
      return `มีงานสั่งน้ำดื่มใหม่รอรับงาน #${p.code}`;
    case 'JOB_ASSIGNED':
      return `มีงานส่งใหม่ ${p.code}`;
    case 'BAG_MISMATCH':
      return `ยอดถุงไม่ตรง ออเดอร์ ${p.code}: ไรเดอร์รับ ${p.collected} ใบ คลังนับได้ ${p.counted} ใบ`;
  }
}

export interface PushSender {
  push(lineUserId: string, text: string): Promise<void>;
}

/** ส่งผ่าน LINE Messaging API push (นับโควตาตามแพ็กเกจ OA) */
export class LinePushSender implements PushSender {
  constructor(private readonly token: string) {}
  async push(to: string, text: string) {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
    });
    if (!res.ok) throw new Error(`LINE push ${res.status}: ${await res.text()}`);
  }
}

/** ใช้ตอนยังไม่มีบัญชี LINE: พิมพ์ข้อความลง log แทน */
export class LogPushSender implements PushSender {
  private readonly log = new Logger('LINE(mock)');
  async push(to: string, text: string) {
    this.log.log(`→ ${to}: ${text}`);
  }
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(NotificationsService.name);
  private timer?: NodeJS.Timeout;
  private readonly sender: PushSender;

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {
    this.sender = cfg.LINE_CHANNEL_ACCESS_TOKEN
      ? new LinePushSender(cfg.LINE_CHANNEL_ACCESS_TOKEN)
      : new LogPushSender();
  }

  /** เรียกภายใน transaction เดียวกับการเปลี่ยนสถานะ เพื่อไม่ให้แจ้งเตือนหายหรือส่งก่อนบันทึกสำเร็จ */
  async enqueue(tx: DbOrTx, userId: string, type: NotificationType, payload: Record<string, unknown>) {
    await tx.insert(notificationOutbox).values({ userId, type, payload });
  }

  async enqueueForRole(tx: DbOrTx, role: 'warehouse' | 'admin' | 'rider', type: NotificationType, payload: Record<string, unknown>) {
    const staff = await tx.select({ id: users.id }).from(users).where(and(eq(users.role, role), eq(users.active, true)));
    for (const s of staff) await this.enqueue(tx, s.id, type, payload);
  }

  onModuleInit() {
    if (this.cfg.NOTIFY_DISPATCH_INTERVAL_MS > 0) {
      this.timer = setInterval(() => void this.dispatch().catch((e) => this.log.error(e)), this.cfg.NOTIFY_DISPATCH_INTERVAL_MS);
    }
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** ส่งข้อความที่ค้างใน outbox (ลองซ้ำสูงสุด 5 ครั้ง) */
  async dispatch(limit = 50): Promise<number> {
    let sent = 0;
    await this.db.transaction(async (tx) => {
      const batch = await tx
        .select({ n: notificationOutbox, lineUserId: users.lineUserId })
        .from(notificationOutbox)
        .innerJoin(users, eq(users.id, notificationOutbox.userId))
        .where(and(eq(notificationOutbox.status, 'PENDING'), lt(notificationOutbox.attempts, 5)))
        .orderBy(asc(notificationOutbox.id))
        .limit(limit)
        .for('update', { of: notificationOutbox, skipLocked: true });
      for (const { n, lineUserId } of batch) {
        try {
          await this.sender.push(lineUserId, renderText(n.type as NotificationType, n.payload as Record<string, unknown>));
          await tx.update(notificationOutbox).set({ status: 'SENT', sentAt: new Date(), attempts: n.attempts + 1 }).where(eq(notificationOutbox.id, n.id));
          sent++;
        } catch (e) {
          this.log.warn(`push failed #${n.id}: ${(e as Error).message}`);
          const attempts = n.attempts + 1;
          await tx.update(notificationOutbox).set({ attempts, status: attempts >= 5 ? 'FAILED' : 'PENDING' }).where(eq(notificationOutbox.id, n.id));
        }
      }
    });
    return sent;
  }
}
