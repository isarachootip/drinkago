import { Controller, ForbiddenException, Headers, HttpCode, Inject, Logger, Post, Req } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Public } from '../common/auth';
import { APP_CONFIG, AppConfig } from '../config';
import { Db, DB } from '../db/db';
import { addresses, lineWebhookEvents, orders, users } from '../db/schema';

export function verifyLineSignature(rawBody: Buffer, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature, 'base64');
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

interface LineEvent {
  type: string;
  webhookEventId: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
}

/**
 * รับ webhook จาก LINE Messaging API
 * ตรวจ X-Line-Signature → ตอบ 200 ทันที → กันซ้ำด้วย webhookEventId → ลงทะเบียนลูกค้า + ตอบกลับด้วยลิงก์สั่งน้ำและ OTP
 */
@Controller('line')
export class LineWebhookController {
  private readonly log = new Logger('LineWebhook');

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  @Post('webhook')
  @Public()
  @HttpCode(200)
  async webhook(@Req() req: Request & { rawBody?: Buffer }, @Headers('x-line-signature') sig?: string) {
    const secret = this.cfg.LINE_CHANNEL_SECRET;
    if (!secret) throw new ForbiddenException('ยังไม่ได้ตั้งค่า LINE_CHANNEL_SECRET');
    if (!req.rawBody || !verifyLineSignature(req.rawBody, sig, secret)) throw new ForbiddenException('ลายเซ็นไม่ถูกต้อง');

    const events: LineEvent[] = (req.body?.events ?? []) as LineEvent[];
    setImmediate(() => void this.process(events).catch((e) => this.log.error(e)));
    return { ok: true };
  }

  async process(events: LineEvent[]) {
    for (const ev of events) {
      const fresh = await this.db
        .insert(lineWebhookEvents)
        .values({ webhookEventId: ev.webhookEventId, type: ev.type })
        .onConflictDoNothing()
        .returning();
      if (fresh.length === 0) continue;

      const lineUserId = ev.source?.userId;
      this.log.log(`event ${ev.type} from ${lineUserId ?? '-'}`);
      if (!lineUserId) continue;

      const customer = await this.ensureCustomerFromLine(lineUserId);
      if ((ev.type === 'follow' || ev.type === 'message') && ev.replyToken && this.cfg.LINE_CHANNEL_ACCESS_TOKEN) {
        const replyText = await this.buildReplyText(customer.id, customer.name, lineUserId);
        await this.replyLine(ev.replyToken, replyText);
      }
    }
  }

  private async ensureCustomerFromLine(lineUserId: string) {
    const [existing] = await this.db.select().from(users).where(eq(users.lineUserId, lineUserId)).limit(1);
    if (existing) return existing;

    const displayName = await this.fetchLineDisplayName(lineUserId);
    const [created] = await this.db
      .insert(users)
      .values({
        lineUserId,
        role: 'customer',
        name: displayName,
        phone: '0800000000',
        customerType: 'individual',
        pdpaConsentAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    const user = created ?? (await this.db.select().from(users).where(eq(users.lineUserId, lineUserId)).limit(1))[0];
    if (created) {
      await this.db.insert(addresses).values({
        userId: created.id,
        label: 'บ้าน (LINE)',
        detail: 'กรุณาตรวจสอบที่อยู่จัดส่ง',
        lat: 13.7563,
        lng: 100.5018,
      });
    }
    return user;
  }

  private async fetchLineDisplayName(lineUserId: string): Promise<string> {
    if (!this.cfg.LINE_CHANNEL_ACCESS_TOKEN) return 'ลูกค้า LINE';
    try {
      const res = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`, {
        headers: { Authorization: `Bearer ${this.cfg.LINE_CHANNEL_ACCESS_TOKEN}` },
      });
      if (!res.ok) return 'ลูกค้า LINE';
      const data = (await res.json()) as { displayName?: string };
      return data.displayName?.trim() || 'ลูกค้า LINE';
    } catch {
      return 'ลูกค้า LINE';
    }
  }

  private async buildReplyText(userId: string, name: string, lineUserId: string): Promise<string> {
    const [myLatest] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.customerId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(1);
    const [anyLatest] = myLatest
      ? [myLatest]
      : await this.db.select().from(orders).orderBy(desc(orders.createdAt)).limit(1);

    const link = `${this.cfg.PUBLIC_WEB_URL.replace(/\/$/, '')}/?lineUserId=${encodeURIComponent(lineUserId)}`;
    const lines = [`สวัสดีคุณ ${name} 💧 ยินดีต้อนรับสู่ Drink&Go (${this.cfg.LINE_OA_BASIC_ID})`];
    if (anyLatest) {
      lines.push(`📦 ออเดอร์ล่าสุด: #${anyLatest.code} (${anyLatest.status})`);
      lines.push(`🔑 รหัส OTP 4 หลักสำหรับแจ้งไรเดอร์: ${anyLatest.deliveryOtp}`);
    }
    lines.push(`🛒 กดสั่งน้ำ/ติดตามสถานะ (ผูกบัญชี LINE ของคุณแล้ว):\n${link}`);
    return lines.join('\n');
  }

  private async replyLine(replyToken: string, text: string) {
    try {
      await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.cfg.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
      });
    } catch (e) {
      this.log.warn(`LINE reply failed: ${(e as Error).message}`);
    }
  }
}
