import {
  DEFAULT_CUSTOMER_LINK_TTL_MS,
  signCustomerLinkToken,
  verifyCustomerLinkToken,
} from '../src/common/password';
import { User } from '../src/common/auth';
import { loadConfig } from '../src/config';
import { Db } from '../src/db/db';
import { LineStatusService } from '../src/line/line-status.service';
import {
  buildCustomerTrackingFlex,
  buildTrackDeepLinkUrl,
  getThaiOrderProgress,
  isActiveOrderStatus,
  selectOrdersForTracking,
  shouldShowDeliveryOtp,
  TrackableOrderCardInput,
} from '../src/line/line-status.templates';

describe('Customer LINE Order Tracking & Token TTL (TDD)', () => {
  it('signCustomerLinkToken & verifyCustomerLinkToken: บังคับวันหมดอายุ (TTL 24 ชม.) และปฏิเสธโทเคนที่หมดอายุแล้ว', () => {
    const secret = 'test-ttl-secret-key-2026-secure';
    const now = 1_750_000_000_000;
    const token = signCustomerLinkToken('U_active_cust_01', secret, {
      nowMs: now,
      ttlMs: DEFAULT_CUSTOMER_LINK_TTL_MS,
    });

    expect(verifyCustomerLinkToken(token, secret, now + 1000)).toBe('U_active_cust_01');
    expect(verifyCustomerLinkToken(token, secret, now + DEFAULT_CUSTOMER_LINK_TTL_MS)).toBe('U_active_cust_01');
    expect(verifyCustomerLinkToken(token, secret, now + DEFAULT_CUSTOMER_LINK_TTL_MS + 1)).toBeNull();
  });

  it('selectOrdersForTracking: ดึงออเดอร์ที่กำลังดำเนินการทั้งหมดขึ้นก่อน ไม่ให้ออเดอร์ล่าสุดที่กดยกเลิกไปบังงานที่กำลังส่ง', () => {
    const orders: TrackableOrderCardInput[] = [
      { id: 'ord-cancelled-newest', code: 'DG-004', status: 'CANCELLED', deliveryOtp: '4444', totalSatang: 6000, expectBagReturn: 0 },
      { id: 'ord-active-2', code: 'DG-003', status: 'CONFIRMED', deliveryOtp: '3333', totalSatang: 12000, expectBagReturn: 1 },
      { id: 'ord-active-1', code: 'DG-002', status: 'OUT_FOR_DELIVERY', deliveryOtp: '2222', totalSatang: 18000, expectBagReturn: 2 },
      { id: 'ord-closed-old', code: 'DG-001', status: 'CLOSED_WITH_RETURN', deliveryOtp: '1111', totalSatang: 6000, expectBagReturn: 1 },
    ];

    const selected = selectOrdersForTracking(orders);
    expect(selected.map((o) => o.id)).toEqual(['ord-active-2', 'ord-active-1']);

    // กรณีไม่มีออเดอร์ที่กำลังดำเนินการเลย ให้แสดงออเดอร์ล่าสุดที่จบแล้ว 1 รายการ
    const finishedOnly = orders.filter((o) => !isActiveOrderStatus(o.status));
    expect(selectOrdersForTracking(finishedOnly).map((o) => o.id)).toEqual(['ord-cancelled-newest']);

    // กรณีลูกค้าใหม่ยังไม่มีออเดอร์เลย
    expect(selectOrdersForTracking([])).toEqual([]);
  });

  it('shouldShowDeliveryOtp & getThaiOrderProgress: แสดง OTP เฉพาะก่อนส่งถึงมือ และแปลงสถานะเป็นภาษาไทย ขั้น 1–8', () => {
    expect(shouldShowDeliveryOtp('PENDING')).toBe(true);
    expect(shouldShowDeliveryOtp('CONFIRMED')).toBe(true);
    expect(shouldShowDeliveryOtp('PACKED')).toBe(true);
    expect(shouldShowDeliveryOtp('PICKED_UP')).toBe(true);
    expect(shouldShowDeliveryOtp('OUT_FOR_DELIVERY')).toBe(true);

    expect(shouldShowDeliveryOtp('DELIVERED')).toBe(false);
    expect(shouldShowDeliveryOtp('BAG_COLLECTED')).toBe(false);
    expect(shouldShowDeliveryOtp('BAG_RETURNED')).toBe(false);
    expect(shouldShowDeliveryOtp('CLOSED')).toBe(false);
    expect(shouldShowDeliveryOtp('CLOSED_WITH_RETURN')).toBe(false);
    expect(shouldShowDeliveryOtp('CANCELLED')).toBe(false);

    const step5 = getThaiOrderProgress('OUT_FOR_DELIVERY');
    expect(step5.step).toBe(5);
    expect(step5.totalSteps).toBe(8);
    expect(step5.label).toContain('วิ่งส่ง');
  });

  it('buildTrackDeepLinkUrl: ใช้ LIFF Auto-Login URL (ไม่แนบโทเคนในลิงก์) เป็นหลัก และใช้ Signed URL ที่มี TTL เป็น Fallback', () => {
    const liffUrl = buildTrackDeepLinkUrl({
      publicWebUrl: 'https://idrink.tamadee.online',
      liffId: '2012276679-cVW55jug',
      lineUserId: 'U_cust_88',
      orderId: 'ord-uuid-88',
    });
    expect(liffUrl).toBe('https://liff.line.me/2012276679-cVW55jug?tab=track&orderId=ord-uuid-88');
    expect(liffUrl).not.toContain('lineToken=');
    expect(liffUrl).not.toContain('lineUserId=');

    const fallbackUrl = buildTrackDeepLinkUrl({
      publicWebUrl: 'https://idrink.tamadee.online',
      liffId: null,
      lineUserId: 'U_cust_88',
      orderId: 'ord-uuid-88',
      rawSecret: 'fallback-secret-key-2026',
    });
    expect(fallbackUrl).toContain('https://idrink.tamadee.online/?lineUserId=U_cust_88&lineToken=');
    expect(fallbackUrl).toContain('&tab=track&orderId=ord-uuid-88');
  });

  it('buildCustomerTrackingFlex: สร้าง Carousel เมื่อมีหลายออเดอร์ Active พร้อม OTP และซ่อน OTP เมื่อส่งเสร็จแล้ว', () => {
    const carouselMsg = buildCustomerTrackingFlex({
      customerName: 'คุณอิสระ',
      lineUserId: 'U_cust_multi',
      oaBasicId: '@157iywjs',
      publicWebUrl: 'https://idrink.tamadee.online',
      liffId: '2012276679-cVW55jug',
      bagBalance: 3,
      orders: [
        { id: 'ord-cxl', code: 'DG-CXL', status: 'CANCELLED', deliveryOtp: '7777', totalSatang: 6000, expectBagReturn: 0 },
        { id: 'ord-2', code: 'DG-ACT2', status: 'PACKED', deliveryOtp: '5566', totalSatang: 12000, expectBagReturn: 1 },
        { id: 'ord-1', code: 'DG-ACT1', status: 'OUT_FOR_DELIVERY', deliveryOtp: '1234', totalSatang: 18000, expectBagReturn: 2 },
      ],
    });

    expect(carouselMsg.type).toBe('flex');
    expect(carouselMsg.contents.type).toBe('carousel');
    const carouselJson = JSON.stringify(carouselMsg);
    expect(carouselJson).toContain('DG-ACT2');
    expect(carouselJson).toContain('5566');
    expect(carouselJson).toContain('DG-ACT1');
    expect(carouselJson).toContain('1234');
    expect(carouselJson).not.toContain('DG-CXL');
    expect(carouselJson).toContain('https://liff.line.me/2012276679-cVW55jug?tab=track&orderId=ord-1');
    expect(carouselJson).toContain('3 ใบ');

    // กรณีออเดอร์ส่งถึงมือลูกค้าแล้ว (DELIVERED หรือ CLOSED_WITH_RETURN) ต้องซ่อนรหัส OTP 4 หลัก
    const deliveredMsg = buildCustomerTrackingFlex({
      customerName: 'คุณอิสระ',
      lineUserId: 'U_cust_done',
      oaBasicId: '@157iywjs',
      publicWebUrl: 'https://idrink.tamadee.online',
      liffId: '2012276679-cVW55jug',
      bagBalance: 1,
      orders: [
        { id: 'ord-done', code: 'DG-DONE01', status: 'CLOSED_WITH_RETURN', deliveryOtp: '9988', totalSatang: 12000, expectBagReturn: 2 },
      ],
    });
    const deliveredJson = JSON.stringify(deliveredMsg);
    expect(deliveredJson).toContain('DG-DONE01');
    expect(deliveredJson).not.toContain('9988');
  });

  it('LineStatusService: ดึงออเดอร์ทั้งหมดของบัญชี LINE ลูกค้าจาก DB และสร้าง Carousel + ข้อความตอบกลับได้ถูกต้อง', async () => {
    const fakeRows = [
      { id: 'ord-3', code: 'DG-CXL9', status: 'CANCELLED', deliveryOtp: '9999', totalSatang: 6000, expectBagReturn: 0 },
      { id: 'ord-2', code: 'DG-ACT2', status: 'CONFIRMED', deliveryOtp: '2468', totalSatang: 12000, expectBagReturn: 1 },
      { id: 'ord-1', code: 'DG-ACT1', status: 'OUT_FOR_DELIVERY', deliveryOtp: '1357', totalSatang: 18000, expectBagReturn: 2 },
    ];
    const fakeDb = {
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: async () => fakeRows,
            }),
          }),
        }),
      }),
    } as unknown as Db;
    const fakeBags = { balance: async () => 5 };
    const cfg = loadConfig({ AUTH_MODE: 'dev', LINE_LIFF_ID: '2012276679-cVW55jug' } as unknown as NodeJS.ProcessEnv);
    const svc = new LineStatusService(fakeDb, cfg, fakeBags as never);
    const customer = { id: 'cust-uuid-1', name: 'คุณลูกค้า LINE', lineUserId: 'U_line_999' } as User;

    const flex = await svc.buildStatusFlex(customer);
    expect(flex.type).toBe('flex');
    expect(flex.contents.type).toBe('carousel');
    const json = JSON.stringify(flex);
    expect(json).toContain('DG-ACT2');
    expect(json).toContain('DG-ACT1');
    expect(json).not.toContain('DG-CXL9');
    expect(json).toContain('https://liff.line.me/2012276679-cVW55jug?tab=track&orderId=ord-1');

    const text = await svc.buildReplyText(customer);
    expect(text).toContain('#DG-ACT2');
    expect(text).toContain('5 ใบ');
  });
});
