import { formatLineAutoReply } from '../src/line/line-reply';

describe('LINE Auto-Reply Formatter (TDD Example)', () => {
  const baseInput = {
    customerName: 'อิสระ ชูทิพย์',
    lineUserId: 'U1234567890abcdef1234567890abcdef',
    oaBasicId: '@157iywjs',
    publicWebUrl: 'https://idrink.tamadee.online/',
    bagBalance: 3,
  };

  it('กรณีมีออเดอร์ล่าสุด: ต้องแสดงรหัสออเดอร์ สถานะ รหัส OTP 4 หลัก ยอดถุงค้าง และลิงก์ผูกบัญชีที่ตัด / ท้ายออก', () => {
    const text = formatLineAutoReply({
      ...baseInput,
      latestOrder: {
        code: 'DG-MVMITL7ZSL',
        status: 'OUT_FOR_DELIVERY',
        deliveryOtp: '4829',
      },
    });

    expect(text).toContain('สวัสดีคุณ อิสระ ชูทิพย์');
    expect(text).toContain('#DG-MVMITL7ZSL (OUT_FOR_DELIVERY)');
    expect(text).toContain('4829');
    expect(text).toContain('🛍️ ยอดถุงค้างสะสม: 3 ใบ');
    expect(text).toContain('https://idrink.tamadee.online/?lineUserId=U1234567890abcdef1234567890abcdef');
  });

  it('กรณีลูกค้าใหม่ยังไม่มีออเดอร์: ต้องแสดงข้อความต้อนรับ ยอดถุงค้าง 0 ใบ และลิงก์สั่งน้ำ', () => {
    const text = formatLineAutoReply({
      ...baseInput,
      bagBalance: 0,
      latestOrder: null,
    });

    expect(text).toContain('ยังไม่มีประวัติคำสั่งซื้อ');
    expect(text).toContain('🛍️ ยอดถุงค้างสะสม: 0 ใบ');
    expect(text).not.toContain('รหัส OTP 4 หลัก');
  });
});
