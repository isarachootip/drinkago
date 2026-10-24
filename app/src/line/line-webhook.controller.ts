import { Controller, ForbiddenException, Headers, HttpCode, Inject, Logger, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Public } from '../common/auth';
import { APP_CONFIG, AppConfig } from '../config';
import { Db, DB } from '../db/db';
import { lineWebhookEvents } from '../db/schema';

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
  source?: { userId?: string };
  message?: { type: string; text?: string };
}

/**
 * รับ webhook จาก LINE Messaging API
 * ตรวจ X-Line-Signature → ตอบ 200 ทันที → กันซ้ำด้วย webhookEventId → ประมวลผลแบบไม่บล็อก
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
      if (fresh.length === 0) continue; // ซ้ำ ข้าม
      // ขั้นถัดไป: follow → ส่งลิงก์ลงทะเบียน LIFF, message → ตอบด้วย Reply API (ไม่นับโควตา)
      this.log.log(`event ${ev.type} from ${ev.source?.userId ?? '-'}`);
    }
  }
}
