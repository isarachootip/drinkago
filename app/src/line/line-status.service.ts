import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { BagLedgerService } from '../bags/bag-ledger.service';
import { User } from '../common/auth';
import { APP_CONFIG, AppConfig } from '../config';
import { Db, DB } from '../db/db';
import { addresses, orders, users } from '../db/schema';
import { LineFlexMessage } from './line-flex.templates';
import { formatLineAutoReply } from './line-reply';
import {
  buildCustomerTrackingFlex,
  selectOrdersForTracking,
  TrackableOrderCardInput,
} from './line-status.templates';

@Injectable()
export class LineStatusService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    private readonly bags: BagLedgerService,
  ) {}

  async ensureCustomerFromLine(lineUserId: string): Promise<User> {
    const [existing] = await this.db.select().from(users).where(eq(users.lineUserId, lineUserId)).limit(1);
    if (existing) return existing;
    const [created] = await this.db
      .insert(users)
      .values({ lineUserId, role: 'customer', name: 'ลูกค้า LINE', phone: '0800000000', customerType: 'individual', pdpaConsentAt: new Date() })
      .onConflictDoNothing()
      .returning();
    const user = created ?? (await this.db.select().from(users).where(eq(users.lineUserId, lineUserId)).limit(1))[0];
    if (created) {
      await this.db.insert(addresses).values({ userId: created.id, label: 'บ้าน (LINE)', detail: 'กรุณาตรวจสอบที่อยู่จัดส่ง', lat: 13.7563, lng: 100.5018 });
    }
    return user;
  }

  private async fetchCustomerOrderSnapshot(customer: User): Promise<{
    bagBalance: number;
    recentOrders: TrackableOrderCardInput[];
  }> {
    const [rows, bagBalance] = await Promise.all([
      this.db
        .select()
        .from(orders)
        .where(eq(orders.customerId, customer.id))
        .orderBy(desc(orders.updatedAt), desc(orders.createdAt))
        .limit(20),
      this.bags.balance(customer.id),
    ]);
    const recentOrders: TrackableOrderCardInput[] = rows.map((r) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      deliveryOtp: r.deliveryOtp,
      totalSatang: r.totalSatang,
      expectBagReturn: r.expectBagReturn,
    }));
    return { bagBalance, recentOrders };
  }

  async buildStatusFlex(customer: User): Promise<LineFlexMessage> {
    const { bagBalance, recentOrders } = await this.fetchCustomerOrderSnapshot(customer);
    return buildCustomerTrackingFlex({
      customerName: customer.name,
      lineUserId: customer.lineUserId,
      oaBasicId: this.cfg.LINE_OA_BASIC_ID,
      publicWebUrl: this.cfg.PUBLIC_WEB_URL,
      liffId: this.cfg.LINE_LIFF_ID,
      rawSecret: this.cfg.DEV_AUTH_KEY ?? this.cfg.LINE_CHANNEL_SECRET,
      bagBalance,
      orders: recentOrders,
    });
  }

  async buildReplyText(customer: User): Promise<string> {
    const { bagBalance, recentOrders } = await this.fetchCustomerOrderSnapshot(customer);
    const [primary] = selectOrdersForTracking(recentOrders, 1);
    return formatLineAutoReply({
      customerName: customer.name,
      lineUserId: customer.lineUserId,
      oaBasicId: this.cfg.LINE_OA_BASIC_ID,
      publicWebUrl: this.cfg.PUBLIC_WEB_URL,
      bagBalance,
      latestOrder: primary
        ? { code: primary.code, status: primary.status, deliveryOtp: primary.deliveryOtp }
        : null,
    });
  }
}
