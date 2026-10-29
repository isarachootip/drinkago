import { signCustomerLinkToken, verifyCustomerLinkToken } from '../src/common/password';
import { loadConfig } from '../src/config';
import { PAYMENT_QUICK_REPLY_ITEMS, safeQuickReplyLabel } from '../src/line/line-checkout.service';
import {
  buildCartFlex,
  buildContactAndShareMessages,
  buildOrderTicketFlex,
  buildProductCarouselFlex,
  buildShareOaFlex,
  buildStatusAndBagFlex,
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
      promptpayId: '0812345678',
      promptpayAccountName: 'บจก. ดริ้งค์ แอนด์ โก',
      publicWebUrl: 'https://idrink.tamadee.online',
      lineUserId: 'U12345',
    });

    expect(msg.type).toBe('flex');
    const json = JSON.stringify(msg);
    expect(json).toContain('DG-TEST999');
    expect(json).toContain('8421');
    expect(json).toContain('promptpay.io/0812345678/120');
    expect(json).toContain('บจก. ดริ้งค์ แอนด์ โก');
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

  it('LineRichMenuService: สร้างโครงสร้าง Rich Menu 6 ช่อง (2x3) พร้อมปุ่มแชร์ QR ให้เพื่อน (action=share_oa) และซิงก์สำเร็จ', async () => {
    const cfg = loadConfig({ AUTH_MODE: 'dev', LINE_OA_BASIC_ID: '@157iywjs' } as unknown as NodeJS.ProcessEnv);
    const mockStorage = {
      save: async () => ({ url: '/uploads/x.png', filename: 'x.png', size: 10, mimetype: 'image/png' }),
      getFilePath: async () => null,
    };
    const svc = new LineRichMenuService(cfg, mockStorage);
    const def = svc.buildRichMenuDefinition();
    expect(def.areas).toHaveLength(6);
    expect(def.areas[0].action.data).toBe('action=share_oa');
    expect(def.areas[1].action.data).toBe('action=status');
    expect(def.areas[2].action.data).toBe('action=reorder');
    expect(def.areas[3].action.data).toBe('action=share_oa');
    expect(def.areas[4].action.data).toBe('action=menu');
    expect(def.areas[5].action.data).toBe('action=contact');

    const syncRes = await svc.syncDefaultRichMenu('/uploads/nonexistent.png');
    expect(syncRes.ok).toBe(true);
    expect(syncRes.areas).toBe(6);
    expect(syncRes.imageSource).toBe('generated');
  });
});
