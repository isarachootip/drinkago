import { describe, expect, it } from 'vitest';
import { bagSummarySchema, formatBaht, orderStatusBadge, productSchema, riderJobSchema, staffOrderSchema } from '../src/api/schemas';
import { distanceMeters, formatDistance } from '../src/domain/geo';
import { MAX_PRODUCT_IMAGE_BYTES, resolveProductImageUrl, validateProductImageFile } from '../src/domain/photo-picker';
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
    expect(resolveProductImageUrl('https://cdn.example.com/a.jpg', 'http://localhost:3000')).toBe('https://cdn.example.com/a.jpg');
  });
});
