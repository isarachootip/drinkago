import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Inject, Logger, Post, Req } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { BagLedgerService } from '../bags/bag-ledger.service';
import { Public, Roles, User } from '../common/auth';
import { parse } from '../common/validate';
import { APP_CONFIG, AppConfig } from '../config';
import { Db, DB } from '../db/db';
import { addresses, lineWebhookEvents, orders, users } from '../db/schema';
import { MeetupEventsService } from '../events/meetup-events.service';
import { StationsService } from '../stations/stations.service';
import { LineCartService } from './line-cart.service';
import { LineCheckoutService } from './line-checkout.service';
import {
  buildContactAndShareMessages, buildMeetupEventsFlex, buildShareOaFlex,
  buildStationsCarouselFlex, buildStatusAndBagFlex, buildVisitUsFlex, LineMessage,
} from './line-flex.templates';
import { LinePaymentReorderService } from './line-payment-reorder.service';
import { formatLineAutoReply } from './line-reply';
import { LineRichMenuService } from './line-rich-menu.service';

const syncRichMenuSchema = z.object({ imageUrl: z.string().trim().max(500).nullable().optional() });

export function verifyLineSignature(rawBody: Buffer, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  try {
    const given = Buffer.from(signature, 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  } catch {
    return false;
  }
}

interface LineEvent {
  type: string;
  webhookEventId: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { id?: string; type: string; text?: string; latitude?: number; longitude?: number; address?: string };
  postback?: { data?: string };
}

@Controller()
export class LineWebhookController {
  private readonly log = new Logger('LineWebhook');

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    private readonly bags: BagLedgerService,
    private readonly eventsService: MeetupEventsService,
    private readonly stations: StationsService,
    private readonly cart: LineCartService,
    private readonly checkout: LineCheckoutService,
    private readonly paymentReorder: LinePaymentReorderService,
    private readonly richMenu: LineRichMenuService,
  ) {}

  @Post('line/webhook')
  @Public()
  @HttpCode(200)
  async webhook(@Req() req: Request & { rawBody?: Buffer }, @Headers('x-line-signature') sig?: string) {
    const secret = this.cfg.LINE_CHANNEL_SECRET;
    if (!secret) throw new ForbiddenException('ยังไม่ได้ตั้งค่า LINE_CHANNEL_SECRET');
    if (!req.rawBody || !verifyLineSignature(req.rawBody, sig, secret)) throw new ForbiddenException('ลายเซ็นไม่ถูกต้อง');
    const events: LineEvent[] = (req.body?.events ?? []) as LineEvent[];
    return { ok: true, replies: await this.process(events) };
  }

  @Get('admin/line/rich-menu')
  @Roles('admin', 'warehouse')
  getRichMenuSpec() {
    return this.richMenu.buildRichMenuDefinition();
  }

  @Post('admin/line/rich-menu/sync')
  @Roles('admin', 'warehouse')
  syncRichMenu(@Body() body?: unknown) {
    const dto = parse(syncRichMenuSchema, body ?? {});
    return this.richMenu.syncDefaultRichMenu(dto.imageUrl);
  }

  async process(events: LineEvent[]): Promise<LineMessage[][]> {
    const allReplies: LineMessage[][] = [];
    for (const ev of events) {
      const fresh = await this.db.insert(lineWebhookEvents).values({ webhookEventId: ev.webhookEventId, type: ev.type }).onConflictDoNothing().returning();
      if (fresh.length === 0 || !ev.source?.userId) continue;
      const customer = await this.ensureCustomerFromLine(ev.source.userId);
      try {
        const messages = await this.dispatchEvent(customer, ev);
        allReplies.push(messages);
        if (ev.replyToken && this.cfg.LINE_CHANNEL_ACCESS_TOKEN && messages.length > 0) await this.replyLine(ev.replyToken, messages);
      } catch (e) {
        const errMsg: LineMessage = { type: 'text', text: `⚠️ ${(e as Error).message}` };
        allReplies.push([errMsg]);
        if (ev.replyToken && this.cfg.LINE_CHANNEL_ACCESS_TOKEN) await this.replyLine(ev.replyToken, [errMsg]);
      }
    }
    return allReplies;
  }

  private async dispatchEvent(customer: User, ev: LineEvent): Promise<LineMessage[]> {
    const shareInput = { oaBasicId: this.cfg.LINE_OA_BASIC_ID, publicWebUrl: this.cfg.PUBLIC_WEB_URL };
    const visitInput = { ...shareInput, facebookUrl: this.cfg.FACEBOOK_PAGE_URL };
    if (ev.type === 'follow') {
      return [await this.buildStatusFlex(customer.id, customer.name, customer.lineUserId), ...(await this.cart.showMenu(this.cfg.PUBLIC_WEB_URL))];
    }
    if (ev.type === 'postback') {
      const params = new URLSearchParams(ev.postback?.data ?? '');
      const action = params.get('action');
      if (action === 'menu') return this.cart.showMenu(this.cfg.PUBLIC_WEB_URL);
      if (action === 'events') return [buildMeetupEventsFlex(await this.eventsService.listPublic(), this.cfg.PUBLIC_WEB_URL, customer.lineUserId)];
      if (action === 'find_stations') return [buildStationsCarouselFlex(await this.stations.listStations())];
      if (action === 'visit_us') return [buildVisitUsFlex(visitInput)];
      if (action === 'share_oa') return [buildShareOaFlex(shareInput)];
      if (action === 'contact') return buildContactAndShareMessages(shareInput);
      if (action === 'quick_add') return this.cart.addItem(customer.lineUserId, Number(params.get('productId')));
      if (action === 'increase') return this.cart.changeQty(customer.lineUserId, Number(params.get('productId')), 1);
      if (action === 'decrease') return this.cart.changeQty(customer.lineUserId, Number(params.get('productId')), -1);
      if (action === 'view_cart') return this.cart.viewCart(customer.lineUserId);
      if (action === 'clear_cart') return this.cart.clearCart(customer.lineUserId);
      if (action === 'checkout') return this.checkout.startCheckout(customer);
      if (action === 'use_address') return this.checkout.proceedAfterAddress(customer, params.get('addressId') ?? '');
      if (action === 'new_address') return this.checkout.promptNewAddress(customer.lineUserId);
      if (action === 'skip_location') return this.checkout.saveAddressAndProceed(customer);
      if (action === 'select_station') {
        const s = await this.cart.getSession(customer.lineUserId);
        return this.checkout.proceedAfterStation(customer, s.tempData?.addressId ?? '', Number(params.get('stationId') ?? 1));
      }
      if (action === 'set_bag_return') {
        const s = await this.cart.getSession(customer.lineUserId);
        return this.checkout.promptPaymentMethod(customer, s.tempData?.addressId ?? '', Number(params.get('qty') ?? 0), s.tempData?.stationId);
      }
      if (action === 'pay_method') {
        return this.checkout.completeCheckout(customer, (params.get('method') ?? 'CASH') as 'CASH' | 'PROMPTPAY' | 'CREDIT');
      }
      if (action === 'cancel_order') return this.checkout.cancelOrderFromLine(customer, params.get('orderId') ?? '');
      if (action === 'reorder') return this.paymentReorder.handleQuickReorder(customer);
      if (action === 'status') return [await this.buildStatusFlex(customer.id, customer.name, customer.lineUserId)];
    }

    if (ev.type === 'message' && ev.message) {
      if (ev.message.type === 'location') {
        const lat = ev.message.latitude ?? 13.7563;
        const lng = ev.message.longitude ?? 100.5018;
        const session = await this.cart.getSession(customer.lineUserId);
        if (session.state === 'AWAITING_LOCATION') return this.checkout.saveAddressAndProceed(customer, { lat, lng });
        const nearest = await this.stations.suggestStations(lat, lng);
        return [buildStationsCarouselFlex(nearest.slice(0, 6), 'ตู้เติมน้ำที่ใกล้คุณที่สุด')];
      }
      if (ev.message.type === 'image') return this.paymentReorder.handleSlipImage(customer, ev.message.id ?? 'img');
      if (ev.message.type === 'text') {
        const text = (ev.message.text ?? '').trim();
        if (/^(ยกเลิก|ล้างตะกร้า|cancel)$/i.test(text)) return this.cart.clearCart(customer.lineUserId);
        const session = await this.cart.getSession(customer.lineUserId);
        if (session.state === 'AWAITING_ADDRESS_DETAIL') return this.checkout.handleAddressDetailText(customer, text);
        if (session.state === 'AWAITING_BAG_RETURN' && /^\d+$/.test(text)) {
          return this.checkout.promptPaymentMethod(customer, session.tempData?.addressId ?? '', Number(text), session.tempData?.stationId);
        }
        if (session.state === 'AWAITING_PAYMENT_METHOD' && /(เงินสด|cash|โอน|promptpay|เครดิต|credit)/i.test(text)) {
          const m = /โอน|promptpay/i.test(text) ? 'PROMPTPAY' : /เครดิต|credit/i.test(text) ? 'CREDIT' : 'CASH';
          return this.checkout.completeCheckout(customer, m);
        }
        if (/กิจกรรม|กิจกรรมพบปะ|ตารางกิจกรรม|event/i.test(text)) return [buildMeetupEventsFlex(await this.eventsService.listPublic(), this.cfg.PUBLIC_WEB_URL, customer.lineUserId)];
        if (/เมนู|สั่งน้ำ|สั่งซื้อ|ส่งใบสั่งซื้อ|menu/i.test(text)) return this.cart.showMenu(this.cfg.PUBLIC_WEB_URL);
        if (/ค้นหาตู้|ตู้เติมน้ำ|ตู้กดน้ำ|สาขา|station/i.test(text)) return [buildStationsCarouselFlex(await this.stations.listStations())];
        if (/ตะกร้า|cart|สรุป/i.test(text)) return this.cart.viewCart(customer.lineUserId);
        if (/สั่งซ้ำ|โปรโมชั่น|โปรโมชัน|reorder/i.test(text)) return this.paymentReorder.handleQuickReorder(customer);
        if (/ติดตามสถานะ|บริการของเรา|สถานะ|เช็คสถานะ|otp|ถุงค้าง/i.test(text)) return [await this.buildStatusFlex(customer.id, customer.name, customer.lineUserId)];
        if (/เยี่ยมชม|เยี่ยมชมเรา|facebook|เพจ|visit/i.test(text)) return [buildVisitUsFlex(visitInput)];
        if (/เป็นเพื่อน|เป็นเพื่อนกับเรา|แชร์|แนะนำเพื่อน|ติดต่อเรา|qr|share|ilife/i.test(text)) return buildContactAndShareMessages(shareInput);
        return [{ type: 'text', text: await this.buildReplyText(customer.id, customer.name, customer.lineUserId) }, await this.buildStatusFlex(customer.id, customer.name, customer.lineUserId)];
      }
    }
    return [];
  }

  private async ensureCustomerFromLine(lineUserId: string): Promise<User> {
    const [existing] = await this.db.select().from(users).where(eq(users.lineUserId, lineUserId)).limit(1);
    if (existing) return existing;
    const [created] = await this.db.insert(users).values({ lineUserId, role: 'customer', name: 'ลูกค้า LINE', phone: '0800000000', customerType: 'individual', pdpaConsentAt: new Date() }).onConflictDoNothing().returning();
    const user = created ?? (await this.db.select().from(users).where(eq(users.lineUserId, lineUserId)).limit(1))[0];
    if (created) await this.db.insert(addresses).values({ userId: created.id, label: 'บ้าน (LINE)', detail: 'กรุณาตรวจสอบที่อยู่จัดส่ง', lat: 13.7563, lng: 100.5018 });
    return user;
  }

  private async buildStatusInput(userId: string, name: string, lineUserId: string) {
    const [myLatest] = await this.db.select().from(orders).where(eq(orders.customerId, userId)).orderBy(desc(orders.createdAt)).limit(1);
    return {
      customerName: name, lineUserId, oaBasicId: this.cfg.LINE_OA_BASIC_ID, publicWebUrl: this.cfg.PUBLIC_WEB_URL,
      bagBalance: await this.bags.balance(userId),
      latestOrder: myLatest ? { code: myLatest.code, status: myLatest.status, deliveryOtp: myLatest.deliveryOtp } : null,
    };
  }

  private async buildReplyText(userId: string, name: string, lineUserId: string): Promise<string> {
    return formatLineAutoReply(await this.buildStatusInput(userId, name, lineUserId));
  }

  private async buildStatusFlex(userId: string, name: string, lineUserId: string): Promise<LineMessage> {
    return buildStatusAndBagFlex(await this.buildStatusInput(userId, name, lineUserId));
  }

  private async replyLine(replyToken: string, messages: LineMessage[]) {
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.LINE_CHANNEL_ACCESS_TOKEN}` },
        body: JSON.stringify({ replyToken, messages: messages.slice(0, 5) }),
      });
      if (!res.ok) this.log.warn(`LINE reply HTTP ${res.status}: ${await res.text()}`);
    } catch (e) {
      this.log.warn(`LINE reply failed: ${(e as Error).message}`);
    }
  }
}
