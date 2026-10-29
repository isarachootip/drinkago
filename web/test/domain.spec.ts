import { describe, expect, it } from 'vitest';
import { bagSummarySchema, formatBaht, orderStatusBadge, productSchema, riderJobSchema, staffOrderSchema } from '../src/api/schemas';
import { distanceMeters, formatDistance } from '../src/domain/geo';
import {
  calculateResizedDimensions,
  MAX_PRODUCT_IMAGE_BYTES,
  MAX_PRODUCT_IMAGE_DIMENSION,
  resolveProductImageUrl,
  validateProductImageFile,
} from '../src/domain/photo-picker';
import { canCustomerCancelOrder, clearAllAuthSessions, resolveActiveIdentity, shouldRequireEntryGate } from '../src/domain/session-gate';
import { getRiderTargetLocation, getRiderWorkflowSteps } from '../src/domain/rider-steps';
import { isoDateToThaiLabel, normalizeTimeParts, thaiLabelToIsoDate } from '../src/domain/thai-datetime';
import { getSavedViewMode, parseViewMode, saveViewMode } from '../src/components/ViewModeToggle';
import { enqueueOfflineMutation, listOfflineMutations, removeOfflineMutation } from '../src/storage/offline-queue';

describe('Geo domain helpers', () => {
  it('คำนวณระยะห่างพิกัดเดียวกันได้ 0 เมตร', () => {
    expect(distanceMeters(13.7563, 100.5018, 13.7563, 100.5018)).toBe(0);
  });

  it('คำนวณระยะห่างและแปลงหน่วย ม. / กม. ได้ถูกต้อง', () => {
    const d = distanceMeters(13.75, 100.5, 13.7501, 100.5001);
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(20);
    expect(formatDistance(12)).toBe('12 ม.');
    expect(formatDistance(1240)).toBe('1.2 กม.');
  });
});

describe('API Boundary Zod Schemas & Status Labels', () => {
  it('ตรวจสอบโครงสร้าง RiderJob จาก API ด้วย Zod ได้ถูกต้อง', () => {
    const raw = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      code: 'DG-1024',
      status: 'CONFIRMED',
      expectBagReturn: 3,
      paymentMethod: 'PROMPTPAY',
      paymentStatus: 'PAID',
      totalSatang: 18000,
      customerName: 'คุณสมใจ',
      customerPhone: '0812345678',
      address: {
        label: 'บ้าน',
        detail: 'สุขุมวิท 50',
        lat: 13.75,
        lng: 100.5,
        note: 'ทางเข้าประตูหลัง',
      },
    };
    const parsed = riderJobSchema.parse(raw);
    expect(parsed.code).toBe('DG-1024');
    expect(formatBaht(parsed.totalSatang)).toBe('฿180');
  });

  it('แปลงสถานะออเดอร์เป็นป้ายกำกับภาษาไทยตาม Flow ขั้น 3–6 ได้ครบถ้วน', () => {
    expect(orderStatusBadge('CONFIRMED').actionLabel).toContain('กดน้ำ');
    expect(orderStatusBadge('PACKED').actionLabel).toContain('ยืนยันการรับสินค้า');
    expect(orderStatusBadge('PICKED_UP').actionLabel).toContain('วิ่งส่งสินค้า');
    expect(orderStatusBadge('OUT_FOR_DELIVERY').actionLabel).toContain('ถึงแล้ว · ยืนยันส่ง');
  });

  it('จัดเก็บและลบคำขอในคิว Offline พร้อมรักษา Idempotency-Key เดิม', async () => {
    await enqueueOfflineMutation({
      idempotencyKey: 'key-test-1',
      endpoint: '/orders/123/pack',
      body: {},
      label: 'กดน้ำ #123',
      createdAt: 1000,
    });
    const list1 = await listOfflineMutations();
    expect(list1).toHaveLength(1);
    expect(list1[0].idempotencyKey).toBe('key-test-1');

    await removeOfflineMutation('key-test-1');
    const list2 = await listOfflineMutations();
    expect(list2).toHaveLength(0);
  });

  it('ตรวจสอบ Zod Schema ของสินค้า ยอดถุง และออเดอร์คลัง/แอดมินได้ถูกต้อง', () => {
    const prod = productSchema.parse({ id: 1, sku: 'WATER-TANK-18L', name: 'น้ำดื่มแบบถัง', priceSatang: 6000, isReturnable: true });
    expect(prod.isReturnable).toBe(true);

    const bags = bagSummarySchema.parse({ balance: 3, history: [] });
    expect(bags.balance).toBe(3);

    const ord = staffOrderSchema.parse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      code: 'DG-2001',
      status: 'BAG_COLLECTED',
      customerId: '550e8400-e29b-41d4-a716-446655440001',
      riderId: '550e8400-e29b-41d4-a716-446655440002',
      totalSatang: 18000,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
      expectBagReturn: 2,
      bagMismatch: false,
      createdAt: new Date().toISOString(),
    });
    expect(ord.status).toBe('BAG_COLLECTED');
  });

  it('ตรวจสอบไฟล์รูปสินค้าสไตล์ ODM (จำกัด 2 MB + MIME) และแปลง URL รูปสินค้าได้ถูกต้อง', () => {
    expect(MAX_PRODUCT_IMAGE_BYTES).toBe(2 * 1024 * 1024);
    expect(validateProductImageFile({ size: 500_000, type: 'image/png' })).toEqual({ valid: true });
    expect(validateProductImageFile({ size: 2 * 1024 * 1024 + 1, type: 'image/jpeg' }).valid).toBe(false);
    expect(validateProductImageFile({ size: 100_000, type: 'application/pdf' }).valid).toBe(false);

    expect(resolveProductImageUrl(null, 'http://localhost:3000')).toBeNull();
    expect(resolveProductImageUrl('   ', 'http://localhost:3000')).toBeNull();
    expect(resolveProductImageUrl('/uploads/water.png', 'http://localhost:3000/')).toBe('http://localhost:3000/uploads/water.png');
    expect(resolveProductImageUrl('http://localhost:3000/uploads/water.png', 'https://idrink.tamadee.online')).toBe('https://idrink.tamadee.online/uploads/water.png');
    expect(resolveProductImageUrl('https://cdn.example.com/a.jpg', 'http://localhost:3000')).toBe('https://cdn.example.com/a.jpg');
  });

  it('ตรวจสอบและสลับโหมดการแสดงผล Card / Grid ของหน้า Admin พร้อมบันทึกค่าได้ถูกต้อง', () => {
    expect(parseViewMode('grid')).toBe('grid');
    expect(parseViewMode('card')).toBe('card');
    expect(parseViewMode('invalid')).toBe('card');
    expect(parseViewMode(null)).toBe('card');

    saveViewMode('grid');
    expect(getSavedViewMode()).toBe('grid');
    saveViewMode('card');
    expect(getSavedViewMode()).toBe('card');
  });

  it('ย่อขนาดรูปภาพสินค้าอัตโนมัติไม่ให้เกิน 800px (แก้ไขปัญหารูป 2,400px โหลดช้า)', () => {
    expect(MAX_PRODUCT_IMAGE_DIMENSION).toBe(800);
    expect(calculateResizedDimensions(2400, 1800)).toEqual({ width: 800, height: 600 });
    expect(calculateResizedDimensions(1600, 2400)).toEqual({ width: 533, height: 800 });
    expect(calculateResizedDimensions(640, 480)).toEqual({ width: 640, height: 480 });
  });

  it('อนุญาตให้ลูกค้ายกเลิกออเดอร์ได้ทั้งสถานะ PENDING และ CONFIRMED (ก่อนไรเดอร์กดน้ำ) และตรวจ Entry Gate บน Production', () => {
    expect(canCustomerCancelOrder('PENDING')).toBe(true);
    expect(canCustomerCancelOrder('CONFIRMED')).toBe(true);
    expect(canCustomerCancelOrder('PACKED')).toBe(false);
    expect(canCustomerCancelOrder('OUT_FOR_DELIVERY')).toBe(false);

    expect(shouldRequireEntryGate({ hostname: 'idrink.tamadee.online', hasLineToken: false, hasStaffSession: false, demoUnlocked: false })).toBe(true);
    expect(shouldRequireEntryGate({ hostname: 'idrink.tamadee.online', hasLineToken: true, hasStaffSession: false, demoUnlocked: false })).toBe(false);
    expect(shouldRequireEntryGate({ hostname: 'localhost', hasLineToken: false, hasStaffSession: false, demoUnlocked: false })).toBe(false);
  });

  it('คำนวณลำดับ Stepper 5 ขั้นของไรเดอร์ (done / current / locked) และสลับความเด่นปุ่มนำทางตามบริบทได้ถูกต้อง', () => {
    const packedSteps = getRiderWorkflowSteps('PACKED', true);
    expect(packedSteps).toHaveLength(5);
    expect(packedSteps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'locked', 'locked']);
    expect(getRiderTargetLocation('CONFIRMED', false)).toBe('station');
    expect(getRiderTargetLocation('PACKED', true)).toBe('station');
    expect(getRiderTargetLocation('PICKED_UP', true)).toBe('customer');
    expect(getRiderTargetLocation('OUT_FOR_DELIVERY', true)).toBe('customer');
  });

  it('ตัดสินสิทธิ์และตัวตนผู้ใช้ปัจจุบันจาก StaffSession (ทุกบทบาท) หรือ LINE Session พร้อมล้างค่าเมื่อ Logout', () => {
    const asCust = resolveActiveIdentity({
      staffUser: { id: 'u1', lineUserId: 'U_cust_1', username: 'cust1', name: 'คุณสมชาย', role: 'customer' },
      customerUser: 'dev-customer',
      detectedLineName: null,
      detectedLineRole: 'customer',
      hasLineToken: false,
    });
    expect(asCust).toEqual({
      displayName: 'คุณสมชาย',
      username: 'cust1',
      lineUserId: 'U_cust_1',
      role: 'customer',
      appTab: 'customer',
      isAuthenticated: true,
    });

    const asWarehouse = resolveActiveIdentity({
      staffUser: { id: 'u2', lineUserId: 'dev-warehouse', username: 'warehouse', name: 'คลังทดสอบ', role: 'warehouse' },
      customerUser: 'dev-customer',
      detectedLineName: null,
      detectedLineRole: 'customer',
      hasLineToken: false,
    });
    expect(asWarehouse.appTab).toBe('admin');
    expect(asWarehouse.isAuthenticated).toBe(true);

    clearAllAuthSessions();
  });

  it('แปลงวันที่ปฏิทินมาตรฐาน (YYYY-MM-DD) <-> วันที่ภาษาไทย (พ.ศ.) และแยกชั่วโมง/นาทีสำหรับตารางเวลาหมุนวนได้ถูกต้อง', () => {
    expect(isoDateToThaiLabel('2026-03-17')).toBe('17 มีนา 2569');
    expect(thaiLabelToIsoDate('17 มีนา 2569')).toBe('2026-03-17');
    expect(thaiLabelToIsoDate('5 ม.ค. 2570')).toBe('2027-01-05');
    expect(normalizeTimeParts('10.00')).toEqual({ hour: '10', minute: '00', display: '10.00' });
    expect(normalizeTimeParts('14:30')).toEqual({ hour: '14', minute: '30', display: '14.30' });
  });
});
