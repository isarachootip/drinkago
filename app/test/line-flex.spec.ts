import {
  buildCartFlex,
  buildOrderTicketFlex,
  buildProductCarouselFlex,
  buildStatusAndBagFlex,
  getSafeProductImageUrl,
} from '../src/line/line-flex.templates';

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

  it('buildStatusAndBagFlex: แสดงสถานะออเดอร์ล่าสุด รหัส OTP และยอดถุงค้างสะสม', () => {
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
  });
});
