import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { BagLedgerService } from '../bags/bag-ledger.service';
import { User } from '../common/auth';
import { APP_CONFIG, AppConfig } from '../config';
import { Db, DB } from '../db/db';
import { addresses } from '../db/schema';
import { OrdersService } from '../orders/orders.service';
import { LineCartService } from './line-cart.service';
import { buildOrderTicketFlex, LineMessage, LineQuickReplyItem } from './line-flex.templates';

const PLACEHOLDER_ADDR = 'กรุณาตรวจสอบที่อยู่จัดส่ง';

@Injectable()
export class LineCheckoutService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    private readonly cart: LineCartService,
    private readonly bags: BagLedgerService,
    private readonly orders: OrdersService,
  ) {}

  async startCheckout(customer: User): Promise<LineMessage[]> {
    const session = await this.cart.getSession(customer.lineUserId);
    if (!session.items || session.items.length === 0) {
      return [{ type: 'text', text: '🛒 ตะกร้าสินค้าว่างเปล่า กรุณาเลือกสินค้าก่อนสั่งซื้อครับ' }];
    }
    const [addr] = await this.db.select().from(addresses).where(eq(addresses.userId, customer.id)).orderBy(desc(addresses.createdAt)).limit(1);
    if (addr && addr.detail !== PLACEHOLDER_ADDR) {
      await this.cart.updateState(customer.lineUserId, 'AWAITING_ADDRESS_CHOICE', { addressId: addr.id });
      return [{
        type: 'text',
        text: `🚚 จัดส่งแบบ Delivery\n📍 ที่อยู่ปัจจุบันของคุณ:\n"${addr.detail}"\n\nต้องการจัดส่งที่เดิมหรือเปลี่ยนที่อยู่ใหม่ครับ?`,
        quickReply: {
          items: [
            { type: 'action', action: { type: 'postback', label: '📍 ใช้ที่อยู่เดิม', data: `action=use_address&addressId=${addr.id}`, displayText: 'ใช้ที่อยู่เดิม' } },
            { type: 'action', action: { type: 'postback', label: '✏️ เปลี่ยนที่อยู่ใหม่', data: 'action=new_address', displayText: 'เปลี่ยนที่อยู่ใหม่' } },
          ],
        },
      }];
    }
    return this.promptNewAddress(customer.lineUserId, addr?.id);
  }

  async promptNewAddress(lineUserId: string, existingAddressId?: string): Promise<LineMessage[]> {
    await this.cart.updateState(lineUserId, 'AWAITING_ADDRESS_DETAIL', { addressId: existingAddressId });
    return [{
      type: 'text',
      text: '🚚 กรุณาพิมพ์รายละเอียดที่อยู่สำหรับจัดส่ง (Delivery):\n▫️ ชื่อผู้รับ และเบอร์ติดต่อ\n▫️ บ้านเลขที่ / อาคาร / ซอย / ถนน / จุดสังเกต\n\n(ตัวอย่าง: คุณสมชาย 081-234-5678 บ้านเลขที่ 88/12 ซอยสุขุมวิท 50)',
    }];
  }

  async handleAddressDetailText(customer: User, text: string): Promise<LineMessage[]> {
    if (text.trim().length < 4) {
      return [{ type: 'text', text: '⚠️ กรุณาระบุรายละเอียดที่อยู่จัดส่งให้ชัดเจน (บ้านเลขที่ ซอย ถนน หรือจุดสังเกต) ครับ' }];
    }
    const session = await this.cart.getSession(customer.lineUserId);
    await this.cart.updateState(customer.lineUserId, 'AWAITING_LOCATION', { ...session.tempData, newAddressDetail: text.trim() });
    return [{
      type: 'text',
      text: '📍 กดปุ่ม "แชร์โลเคชัน (GPS)" ด้านล่างเพื่อให้ระบบคำนวณหาตู้กดน้ำใกล้บ้านและนำทางไรเดอร์ (หรือกดข้ามหากไม่สะดวกครับ) 👇',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'location', label: '📍 แชร์โลเคชัน (GPS)' } },
          { type: 'action', action: { type: 'postback', label: '➡️ ข้ามพิกัด GPS', data: 'action=skip_location', displayText: 'ข้ามพิกัด GPS' } },
        ],
      },
    }];
  }

  async saveAddressAndProceed(customer: User, coords?: { lat: number; lng: number }): Promise<LineMessage[]> {
    const session = await this.cart.getSession(customer.lineUserId);
    const detail = session.tempData?.newAddressDetail || 'ที่อยู่จัดส่ง LINE';
    const lat = coords?.lat ?? 13.7563;
    const lng = coords?.lng ?? 100.5018;
    const [existing] = await this.db.select().from(addresses).where(eq(addresses.userId, customer.id)).orderBy(desc(addresses.createdAt)).limit(1);

    let addressId: string;
    if (existing) {
      const [updated] = await this.db.update(addresses).set({ detail, lat, lng }).where(eq(addresses.id, existing.id)).returning();
      addressId = updated.id;
    } else {
      const [created] = await this.db.insert(addresses).values({ userId: customer.id, label: 'บ้าน (LINE)', detail, lat, lng }).returning();
      addressId = created.id;
    }
    return this.proceedAfterAddress(customer, addressId);
  }

  async proceedAfterAddress(customer: User, addressId: string): Promise<LineMessage[]> {
    const bagBalance = await this.bags.balance(customer.id);
    if (bagBalance <= 0) return this.promptPaymentMethod(customer, addressId, 0);

    await this.cart.updateState(customer.lineUserId, 'AWAITING_BAG_RETURN', { addressId });
    const choices = [...new Set([0, 1, 2, bagBalance])].filter((n) => n >= 0 && n <= bagBalance);
    const items: LineQuickReplyItem[] = choices.map((qty) => ({
      type: 'action',
      action: {
        type: 'postback',
        label: qty === 0 ? 'ไม่คืนรอบนี้ (0 ใบ)' : qty === bagBalance ? `คืนทั้งหมด (${qty} ใบ)` : `คืน ${qty} ใบ`,
        data: `action=set_bag_return&qty=${qty}`,
        displayText: qty === 0 ? 'ไม่คืนถุงรอบนี้' : `คืนถุง ${qty} ใบ`,
      },
    }));

    return [{
      type: 'text',
      text: `🛍️ คุณมียอดถุงหมุนเวียนค้างสะสม ${bagBalance} ใบ\nรอบนี้ต้องการฝากคืนถุงให้ไรเดอร์กี่ใบครับ? 👇`,
      quickReply: { items },
    }];
  }

  async promptPaymentMethod(customer: User, addressId: string, expectBagReturn: number): Promise<LineMessage[]> {
    const bagBalance = await this.bags.balance(customer.id);
    const safeBagReturn = Math.max(0, Math.min(expectBagReturn, bagBalance));
    await this.cart.updateState(customer.lineUserId, 'AWAITING_PAYMENT_METHOD', { addressId, expectBagReturn: safeBagReturn });
    return [{
      type: 'text',
      text: '💳 กรุณาเลือกวิธีชำระเงินสำหรับออเดอร์นี้ครับ 👇',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'postback', label: '💵 เงินสดปลายทาง (CASH)', data: 'action=pay_method&method=CASH', displayText: 'ชำระเงินสดปลายทาง' } },
          { type: 'action', action: { type: 'postback', label: '📲 โอน PromptPay QR', data: 'action=pay_method&method=PROMPTPAY', displayText: 'ชำระผ่าน PromptPay QR' } },
          { type: 'action', action: { type: 'postback', label: '💳 วงเงินเครดิตสมาชิก', data: 'action=pay_method&method=CREDIT', displayText: 'ชำระด้วยวงเงินเครดิต' } },
        ],
      },
    }];
  }

  async completeCheckout(customer: User, paymentMethod: 'CASH' | 'PROMPTPAY' | 'CREDIT'): Promise<LineMessage[]> {
    const session = await this.cart.getSession(customer.lineUserId);
    const items = session.items ?? [];
    if (items.length === 0) return [{ type: 'text', text: '🛒 ตะกร้าสินค้าว่างเปล่า กรุณาเลือกสินค้าใหม่ครับ' }];
    const [fallbackAddr] = await this.db.select().from(addresses).where(eq(addresses.userId, customer.id)).limit(1);
    const addressId = session.tempData?.addressId ?? fallbackAddr?.id;
    if (!addressId) return this.promptNewAddress(customer.lineUserId);

    const order = await this.orders.create(customer, {
      addressId,
      items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
      expectBagReturn: session.tempData?.expectBagReturn ?? 0,
      paymentMethod,
    });
    const [addr] = await this.db.select().from(addresses).where(eq(addresses.id, order.addressId)).limit(1);
    await this.cart.updateState(customer.lineUserId, paymentMethod === 'PROMPTPAY' ? 'AWAITING_SLIP' : null, { pendingOrderId: order.id }, true);

    return [buildOrderTicketFlex({
      orderCode: order.code,
      deliveryOtp: order.deliveryOtp,
      customerName: customer.name,
      addressDetail: addr?.detail ?? '-',
      items,
      totalSatang: order.totalSatang,
      expectBagReturn: order.expectBagReturn,
      paymentMethod: order.paymentMethod,
      promptpayId: this.cfg.PROMPTPAY_ID,
      promptpayAccountName: this.cfg.PROMPTPAY_ACCOUNT_NAME,
      publicWebUrl: this.cfg.PUBLIC_WEB_URL,
      lineUserId: customer.lineUserId,
    })];
  }
}
