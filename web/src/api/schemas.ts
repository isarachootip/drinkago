import { z } from 'zod';

export const orderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED_DELIVERY',
  'BAG_COLLECTED',
  'BAG_RETURNED',
  'CLOSED',
  'CLOSED_WITH_RETURN',
  'CANCELLED',
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const addressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string(),
  detail: z.string(),
  lat: z.number(),
  lng: z.number(),
  note: z.string().nullable().optional(),
});

export type CustomerAddress = z.infer<typeof addressSchema>;

export const riderJobSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  status: orderStatusSchema,
  expectBagReturn: z.number().int().nonnegative(),
  paymentMethod: z.enum(['CASH', 'PROMPTPAY']),
  paymentStatus: z.enum(['UNPAID', 'PENDING_VERIFY', 'PAID']),
  totalSatang: z.number().int().nonnegative(),
  customerName: z.string(),
  customerPhone: z.string().nullable().optional(),
  address: addressSchema,
});

export type RiderJob = z.infer<typeof riderJobSchema>;

export const orderItemSchema = z.object({
  productId: z.number().int(),
  name: z.string(),
  qty: z.number().int().positive(),
  priceSatang: z.number().int().nonnegative(),
  isReturnable: z.boolean(),
});

export const orderDetailSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  status: orderStatusSchema,
  expectBagReturn: z.number().int().nonnegative(),
  paymentMethod: z.enum(['CASH', 'PROMPTPAY']),
  paymentStatus: z.enum(['UNPAID', 'PENDING_VERIFY', 'PAID']),
  totalSatang: z.number().int().nonnegative(),
  deliveryOtp: z.string().optional(),
  bagMismatch: z.boolean().optional(),
  otpLocked: z.boolean().optional(),
  riderId: z.string().uuid().nullable().optional(),
  items: z.array(orderItemSchema),
  address: addressSchema,
});

export type OrderDetail = z.infer<typeof orderDetailSchema>;

export const productSchema = z.object({
  id: z.number().int(),
  sku: z.string(),
  name: z.string(),
  priceSatang: z.number().int().nonnegative(),
  isReturnable: z.boolean(),
});

export type Product = z.infer<typeof productSchema>;

export const bagSummarySchema = z.object({
  balance: z.number().int(),
  history: z.array(
    z.object({
      id: z.number().int(),
      movement: z.string(),
      qty: z.number().int(),
      counted: z.number().int().nullable().optional(),
      orderCode: z.string().nullable().optional(),
      createdAt: z.string(),
    }),
  ),
});

export type BagSummary = z.infer<typeof bagSummarySchema>;

export const staffOrderSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  status: orderStatusSchema,
  customerId: z.string().uuid(),
  riderId: z.string().uuid().nullable().optional(),
  totalSatang: z.number().int().nonnegative(),
  paymentMethod: z.enum(['CASH', 'PROMPTPAY']),
  paymentStatus: z.enum(['UNPAID', 'PENDING_VERIFY', 'PAID']),
  expectBagReturn: z.number().int().nonnegative(),
  bagMismatch: z.boolean(),
  otpLocked: z.boolean().optional(),
  createdAt: z.string(),
});

export type StaffOrder = z.infer<typeof staffOrderSchema>;

export const riderUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  vehicle: z.string().nullable().optional(),
  zone: z.string().nullable().optional(),
});

export type RiderUser = z.infer<typeof riderUserSchema>;

export const orderEventSchema = z.object({
  id: z.number().int(),
  orderId: z.string().uuid(),
  fromStatus: z.string().nullable().optional(),
  toStatus: z.string(),
  actorRole: z.string(),
  photoUrl: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type OrderEvent = z.infer<typeof orderEventSchema>;

export const uploadResponseSchema = z.object({
  url: z.string().url(),
});

export interface EvidenceInput {
  photoUrl: string;
  lat: number;
  lng: number;
}

export interface DevAuthSettings {
  apiBaseUrl: string;
  devUser: string;
  devKey: string;
  mockGps: boolean;
  mockLat: number;
  mockLng: number;
}

export function formatBaht(satang: number): string {
  const baht = satang / 100;
  return Number.isInteger(baht) ? `฿${baht.toLocaleString('th-TH')}` : `฿${baht.toFixed(2)}`;
}

export function orderStatusBadge(status: OrderStatus): {
  stepText: string;
  actionLabel: string;
  buttonColor: string;
} {
  switch (status) {
    case 'CONFIRMED':
      return {
        stepText: 'ขั้นที่ 3 · รอกดน้ำ/จัดเตรียม',
        actionLabel: 'ขั้นที่ 3: กดน้ำเสร็จแล้ว (PACKED)',
        buttonColor: '#0B6E8A',
      };
    case 'PACKED':
      return {
        stepText: 'ขั้นที่ 4 · รอรับสินค้าขึ้นรถ',
        actionLabel: 'ขั้นที่ 4: ยืนยันการรับสินค้า (ถ่ายรูป + GPS)',
        buttonColor: '#1A56B0',
      };
    case 'PICKED_UP':
      return {
        stepText: 'ขั้นที่ 5 · รับสินค้าแล้ว พร้อมออกส่ง',
        actionLabel: 'ขั้นที่ 5: เริ่มวิ่งส่งสินค้า',
        buttonColor: '#1A56B0',
      };
    case 'OUT_FOR_DELIVERY':
      return {
        stepText: 'ขั้นที่ 6 · กำลังวิ่งส่งสินค้า',
        actionLabel: 'ถึงแล้ว · ยืนยันส่ง',
        buttonColor: '#1E7B45',
      };
    default:
      return {
        stepText: status,
        actionLabel: 'ดูรายละเอียด',
        buttonColor: '#4A5B6E',
      };
  }
}
