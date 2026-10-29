import { signCustomerLinkToken, verifyCustomerLinkToken } from '../src/common/password';
import { loadConfig } from '../src/config';
import { buildGoogleMapsSearchUrl } from '../src/events/meetup-events.service';
import { PAYMENT_QUICK_REPLY_ITEMS, safeQuickReplyLabel } from '../src/line/line-checkout.service';
import {
  buildCartFlex,
  buildContactAndShareMessages,
  buildMeetupEventsFlex,
  buildOrderTicketFlex,
  buildProductCarouselFlex,
  buildShareOaFlex,
  buildStationsCarouselFlex,
  buildStatusAndBagFlex,
  buildVisitUsFlex,
  getSafeProductImageUrl,
} from '../src/line/line-flex.templates';
import { LineRichMenuService } from '../src/line/line-rich-menu.service';

describe('LINE Flex Message Templates (ODM-style Delivery)', () => {
  it('getSafeProductImageUrl: คืนค่า URL ที่ปลอดภัย และแปลง localhost /uploads เป็น PUBLIC_WEB_URL เสมอ', () => {
    expect(getSafeProductImageUrl(null, 'https://idrink.tamadee.online')).toMatch(/^https:\/\//);
    expect(getSafeProductImageUrl('/uploads/water.png', 'https://idrink.tamadee.online/')).toBe(
      'https://idrink.tamadee.online/uploads/water.png',
    );
    expect(getSafeProductImageUrl('http://localhost:3000/uploads/water.png', 'https://idrink.tamadee.online')).toBe(
      'https://idrink.tamadee.online/uploads/water.png',
    );
    expect(getSafeProductImageUrl('https://example.com/item.jpg', 'https://idrink.tamadee.online')).toBe(
      'https://example.com/item.jpg',
    );
  });

  it('buildProductCarouselFlex: สร้าง Carousel การ์ดสินค้าพร้อมปุ่ม Postback quick_add', () => {
    const msg = buildProductCarouselFlex(
      [
        {
          id: 1,
          sku: 'WATER-TANK-18L',
          name: 'น้ำดื่มแบบถัง 18 ลิตร',
          priceSatang: 6000,
          isReturnable: true,
          imageUrl: '/uploads/tank.png',
        },
        {
          id: 2,
          sku: 'WATER-PACK-12',
          name: 'น้ำดื่มแบบแพ็ก 12 ขวด',
          priceSatang: 5500,
          isReturnable: false,
          imageUrl: null,
        },
      ],
      'https://idrink.tamadee.online',
    );

    expect(msg.type).toBe('flex');
    expect(msg.altText).toContain('เมนู');
    expect(msg.contents.type).toBe('carousel');
    const json = JSON.stringify(msg);
    expect(json).toContain('action=quick_add&productId=1');
    expect(json).toContain('action=quick_add&productId=2');
    expect(json).toContain('น้ำดื่มแบบถัง 18 ลิตร');
    expect(json).toContain('มีถุงหมุนเวียน');
    expect(json).toContain('https://idrink.tamadee.online/uploads/tank.png');
  });

  it('buildCartFlex: สร้างการ์ดตะกร้าพร้อมปุ่ม +/- และปุ่มยืนยันการสั่งซื้อ (action=checkout)', () => {
    const msg = buildCartFlex([
      { productId: 1, name: 'น้ำดื่มแบบถัง', priceSatang: 6000, isReturnable: true, qty: 2 },
      { productId: 2, name: 'น้ำดื่มแบบแพ็ก', priceSatang: 5500, isReturnable: false, qty: 1 },
    ]);

    expect(msg.type).toBe('flex');
    expect(msg.contents.type).toBe('bubble');
    const json = JSON.stringify(msg);
    expect(json).toContain('action=decrease&productId=1');
    expect(json).toContain('action=increase&productId=1');
    expect(json).toContain('action=checkout');
    expect(json).toContain('action=clear_cart');
    expect(json).toContain('175'); // (60*2 + 55*1) = 175 บาท
  });

  it('buildOrderTicketFlex: แสดงรหัสออเดอร์ รหัส OTP 4 หลัก และกรณี PROMPTPAY ต้องแสดง QR Code พร้อมคำแนะนำส่งสลิป', () => {
    const msg = buildOrderTicketFlex({
      orderCode: 'DG-TEST999',
      deliveryOtp: '8421',
      customerName: 'คุณสมชาย',
      addressDetail: 'สุขุมวิท 50 แขวงพระโขนง',
      items: [{ productId: 1, name: 'น้ำดื่มแบบถัง', priceSatang: 6000, isReturnable: true, qty: 2 }],
      totalSatang: 12000,
      expectBagReturn: 2,
      paymentMethod: 'PROMPTPAY',
      promptpayId: '0636395619',
      promptpayAccountName: 'อิศระ ชูทิพย์',
      publicWebUrl: 'https://idrink.tamadee.online',
      lineUserId: 'U12345',
    });

    expect(msg.type).toBe('flex');
    const json = JSON.stringify(msg);
    expect(json).toContain('DG-TEST999');
    expect(json).toContain('8421');
    expect(json).toContain('promptpay.io/0636395619/120');
    expect(json).toContain('อิศระ ชูทิพย์');
    expect(json).toContain('ส่งรูปสลิป');
  });

  it('buildStatusAndBagFlex: แสดงสถานะออเดอร์ล่าสุด รหัส OTP และยอดถุงค้างสะสม พร้อมแนบ lineToken ที่ลงลายเซ็น', () => {
    const msg = buildStatusAndBagFlex({
      customerName: 'คุณสมชาย',
      lineUserId: 'U12345',
      oaBasicId: '@157iywjs',
      publicWebUrl: 'https://idrink.tamadee.online',
      bagBalance: 4,
      latestOrder: {
        code: 'DG-TEST999',
        status: 'OUT_FOR_DELIVERY',
        deliveryOtp: '8421',
      },
    });

    expect(msg.type).toBe('flex');
    const json = JSON.stringify(msg);
    expect(json).toContain('DG-TEST999');
    expect(json).toContain('8421');
    expect(json).toContain('4 ใบ');
    expect(json).toContain('lineToken=');
    expect(json).toContain('tab=track');
  });

  it('PAYMENT_QUICK_REPLY_ITEMS & safeQuickReplyLabel: ป้ายกำกับ Quick Reply ทุกปุ่มต้องยาวไม่เกิน 20 ตัวอักษรตามข้อกำหนด LINE API', () => {
    for (const item of PAYMENT_QUICK_REPLY_ITEMS) {
      expect(item.action.label.length).toBeLessThanOrEqual(20);
    }
    expect(safeQuickReplyLabel('💵 เงินสดปลายทาง (CASH) ยาวเกินยี่สิบตัวอักษร').length).toBeLessThanOrEqual(20);
  });

  it('buildOrderTicketFlex: รองรับปุ่มยกเลิกคำสั่งซื้อ (action=cancel_order) เมื่อส่ง orderId และแนบ lineToken', () => {
    const msg = buildOrderTicketFlex({
      orderId: 'ord-uuid-123',
      orderCode: 'DG-CANCEL01',
      deliveryOtp: '1122',
      customerName: 'คุณสมศรี',
      addressDetail: 'อ่อนนุช 17',
      items: [{ productId: 1, name: 'น้ำดื่มแบบถัง', priceSatang: 6000, isReturnable: true, qty: 1 }],
      totalSatang: 6000,
      expectBagReturn: 0,
      paymentMethod: 'CASH',
      promptpayId: '0812345678',
      promptpayAccountName: 'บจก. ดริ้งค์ แอนด์ โก',
      publicWebUrl: 'https://idrink.tamadee.online',
      lineUserId: 'U_cust_cancel',
    });
    const json = JSON.stringify(msg);
    expect(json).toContain('action=cancel_order&orderId=ord-uuid-123');
    expect(json).toContain('lineToken=');
  });

  it('signCustomerLinkToken & verifyCustomerLinkToken: ลงลายเซ็น HMAC-SHA256 และป้องกันการปลอมแปลง lineUserId บน URL', () => {
    const token = signCustomerLinkToken('U_real_customer_99', 'test-secret-key-123456');
    expect(verifyCustomerLinkToken(token, 'test-secret-key-123456')).toBe('U_real_customer_99');
    expect(verifyCustomerLinkToken(`${token}tampered`, 'test-secret-key-123456')).toBeNull();
    expect(verifyCustomerLinkToken('invalid-token', 'test-secret-key-123456')).toBeNull();
  });

  it('buildShareOaFlex: สร้างการ์ด QR Code เพิ่มเพื่อน พร้อมปุ่มแชร์นามบัตรร้านให้เพื่อน (recommendOA) และปุ่มเปิดหน้า QR เต็มจอ', () => {
    const msg = buildShareOaFlex({
      oaBasicId: '@157iywjs',
      publicWebUrl: 'https://idrink.tamadee.online',
    });

    expect(msg.type).toBe('flex');
    const json = JSON.stringify(msg);
    expect(json).toContain('https://line.me/R/nv/recommendOA/@157iywjs');
    expect(json).toContain('https://line.me/R/ti/p/@157iywjs');
    expect(json).toContain('api.qrserver.com/v1/create-qr-code');

    const contactMsgs = buildContactAndShareMessages({
      oaBasicId: '@157iywjs',
      publicWebUrl: 'https://idrink.tamadee.online',
    });
    expect(contactMsgs).toHaveLength(2);
    expect(contactMsgs[0].type).toBe('text');
    expect(contactMsgs[1].type).toBe('flex');
  });

  it('LineRichMenuService: สร้างโครงสร้าง Rich Menu 6 ช่องใหม่ (กิจกรรมพบปะ, สั่งน้ำดื่ม, ค้นหาตู้เติมน้ำทั่วไทย, ติดตามสถานะ, เป็นเพื่อนกับเรา, เยี่ยมชมเรา) และโหลดภาพมาตรฐาน bundled ได้', async () => {
    const cfg = loadConfig({ AUTH_MODE: 'dev', LINE_OA_BASIC_ID: '@157iywjs' } as unknown as NodeJS.ProcessEnv);
    const mockStorage = {
      save: async () => ({ url: '/uploads/x.png', filename: 'x.png', size: 10, mimetype: 'image/png' }),
      getFilePath: async () => null,
    };
    const svc = new LineRichMenuService(cfg, mockStorage);
    const def = svc.buildRichMenuDefinition();
    expect(def.areas).toHaveLength(6);
    expect(def.areas[0].action.data).toBe('action=events');
    expect(def.areas[1].action.data).toBe('action=menu');
    expect(def.areas[2].action.data).toBe('action=find_stations');
    expect(def.areas[3].action.data).toBe('action=status');
    expect(def.areas[4].action.data).toBe('action=share_oa');
    expect(def.areas[5].action.data).toBe('action=visit_us');

    const syncRes = await svc.syncDefaultRichMenu();
    expect(syncRes.ok).toBe(true);
    expect(syncRes.areas).toBe(6);
    expect(syncRes.imageSource).toBe('bundled');
  });

  it('buildMeetupEventsFlex, buildStationsCarouselFlex, buildVisitUsFlex: สร้างการ์ดสำหรับปุ่มกิจกรรมพบปะ, ค้นหาตู้เติมน้ำ และเยี่ยมชมเราครบถ้วน', () => {
    const defaultLoc = 'โรงแรมอุทัยรัตน อ เมือง อุทัยธานี';
    const mapUrl = buildGoogleMapsSearchUrl(defaultLoc);
    expect(mapUrl).toContain('google.com/maps/search/');

    const evFlex = buildMeetupEventsFlex(
      [
        {
          id: 1,
          title: 'กิจกรรมพบปะทีม ilife',
          eventDate: '17 มีนา 2569',
          eventTime: '10.00',
          locationName: defaultLoc,
          contactPhone: '0634455',
          mapUrl,
          active: true,
          createdAt: new Date().toISOString(),
        },
      ],
      'https://idrink.tamadee.online',
      'U_cust_01',
    );
    const evJson = JSON.stringify(evFlex);
    expect(evJson).toContain('17 มีนา 2569');
    expect(evJson).toContain('โรงแรมอุทัยรัตน อ เมือง อุทัยธานี');
    expect(evJson).toContain('0634455');
    expect(evJson).toContain('tab=events');

    const stFlex = buildStationsCarouselFlex([
      { id: 1, code: 'ST-01', name: 'สาขาสุขุมวิท', addressDetail: 'สุขุมวิท 50', lat: 13.7, lng: 100.6, bagBalance: 50, distanceKm: 1.2 },
    ]);
    expect(JSON.stringify(stFlex)).toContain('ST-01');
    expect(JSON.stringify(stFlex)).toContain('1.2 กม.');

    const visitFlex = buildVisitUsFlex({
      oaBasicId: '@157iywjs',
      publicWebUrl: 'https://idrink.tamadee.online',
      facebookUrl: 'https://www.facebook.com/ilife',
    });
    expect(JSON.stringify(visitFlex)).toContain('https://www.facebook.com/ilife');
  });
});
