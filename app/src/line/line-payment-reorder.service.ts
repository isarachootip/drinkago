import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { User } from '../common/auth';
import { APP_CONFIG, AppConfig } from '../config';
import { Db, DB } from '../db/db';
import { addresses, orderItems, orders, products } from '../db/schema';
import { OrdersService } from '../orders/orders.service';
import { FILE_STORAGE, FileStorage } from '../uploads/storage.interface';
import { LineCartService } from './line-cart.service';
import { buildOrderTicketFlex, LineMessage } from './line-flex.templates';

const FALLBACK_SLIP_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

@Injectable()
export class LinePaymentReorderService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    private readonly cart: LineCartService,
    private readonly orders: OrdersService,
  ) {}

  async handleQuickReorder(customer: User): Promise<LineMessage[]> {
    const order = await this.orders.reorderLast(customer, {});
    const [addr] = await this.db.select().from(addresses).where(eq(addresses.id, order.addressId)).limit(1);
    const rows = await this.db
      .select({
        productId: orderItems.productId,
        name: products.name,
        priceSatang: orderItems.priceSatang,
        isReturnable: orderItems.isReturnable,
        qty: orderItems.qty,
      })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(eq(orderItems.orderId, order.id));

    await this.cart.updateState(
      customer.lineUserId,
      order.paymentMethod === 'PROMPTPAY' ? 'AWAITING_SLIP' : null,
      { pendingOrderId: order.id },
      true,
    );
    return [
      buildOrderTicketFlex({
        orderCode: order.code,
        deliveryOtp: order.deliveryOtp,
        customerName: customer.name,
        addressDetail: addr?.detail ?? '-',
        items: rows,
        totalSatang: order.totalSatang,
        expectBagReturn: order.expectBagReturn,
        paymentMethod: order.paymentMethod,
        promptpayId: this.cfg.PROMPTPAY_ID,
        promptpayAccountName: this.cfg.PROMPTPAY_ACCOUNT_NAME,
        publicWebUrl: this.cfg.PUBLIC_WEB_URL,
        lineUserId: customer.lineUserId,
      }),
    ];
  }

  async handleSlipImage(customer: User, messageId: string): Promise<LineMessage[]> {
    const session = await this.cart.getSession(customer.lineUserId);
    let targetOrderId = session.tempData?.pendingOrderId;
    if (!targetOrderId) {
      const [latest] = await this.db
        .select()
        .from(orders)
        .where(eq(orders.customerId, customer.id))
        .orderBy(desc(orders.createdAt))
        .limit(1);
      if (latest && latest.paymentMethod === 'PROMPTPAY' && latest.paymentStatus === 'UNPAID') {
        targetOrderId = latest.id;
      }
    }
    if (!targetOrderId) {
      return [{ type: 'text', text: 'ℹ️ ไม่พบออเดอร์ที่รอแจ้งโอนเงิน หากต้องการสั่งน้ำดื่มพิมพ์ "เมนู" ได้เลยครับ' }];
    }

    const imgBuffer = await this.downloadLineImage(messageId);
    const stored = await this.storage.save({
      buffer: imgBuffer,
      originalname: `slip-${targetOrderId}.png`,
      mimetype: 'image/png',
      size: imgBuffer.length,
    });
    const updated = await this.orders.submitSlip(targetOrderId, customer, {
      slipUrl: stored.url,
      ref: `line:${messageId}`,
    });
    await this.cart.updateState(customer.lineUserId, null, {});
    return [
      {
        type: 'text',
        text: `✅ ได้รับสลิปโอนเงินสำหรับออเดอร์ #${updated.code} เรียบร้อยแล้วครับ!\nสถานะการชำระเงิน: รอแอดมินตรวจสอบ (${updated.paymentStatus})\n🔑 รหัส OTP แจ้งไรเดอร์ของคุณคือ: ${updated.deliveryOtp}`,
      },
    ];
  }

  private async downloadLineImage(messageId: string): Promise<Buffer> {
    if (!this.cfg.LINE_CHANNEL_ACCESS_TOKEN) return FALLBACK_SLIP_PNG;
    try {
      const res = await fetch(`https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`, {
        headers: { Authorization: `Bearer ${this.cfg.LINE_CHANNEL_ACCESS_TOKEN}` },
      });
      if (!res.ok) return FALLBACK_SLIP_PNG;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return FALLBACK_SLIP_PNG;
    }
  }
}
