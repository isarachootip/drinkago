export const FLOW_STEPS: { status: string; label: string }[] = [
  { status: 'PENDING', label: '1. ลูกค้าสั่งซื้อ (PENDING)' },
  { status: 'CONFIRMED', label: '2. รับคำสั่งซื้อแล้ว (CONFIRMED)' },
  { status: 'PACKED', label: '3. พนักงานขนส่ง กดน้ำ/จัดของ (PACKED)' },
  { status: 'PICKED_UP', label: '4. ยืนยันการรับสินค้า (PICKED_UP)' },
  { status: 'OUT_FOR_DELIVERY', label: '5. วิ่งส่งสินค้า (OUT_FOR_DELIVERY)' },
  { status: 'DELIVERED', label: '6. ยืนยันการจัดส่ง (DELIVERED)' },
  { status: 'BAG_COLLECTED', label: '7. ยืนยันรับถุงขาคืน (BAG_COLLECTED)' },
  { status: 'CLOSED_WITH_RETURN', label: '8. ปิดงานพร้อมบันทึกถุงคืน' },
];

const TERMINAL_STATUSES = new Set(['CLOSED', 'CLOSED_WITH_RETURN', 'CANCELLED']);
const OTP_VISIBLE_STATUSES = new Set([
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'FAILED_DELIVERY',
]);

export function isCustomerOrderActive(status: string): boolean {
  return !TERMINAL_STATUSES.has(status);
}

export function shouldShowCustomerOtp(status: string): boolean {
  return OTP_VISIBLE_STATUSES.has(status);
}

export function pickDefaultTrackedOrderId<T extends { id: string; status: string }>(
  orders: T[],
  preferredOrderId?: string | null,
): string | null {
  if (orders.length === 0) return null;
  if (preferredOrderId && orders.some((o) => o.id === preferredOrderId)) {
    return preferredOrderId;
  }
  const active = orders.find((o) => isCustomerOrderActive(o.status));
  return active ? active.id : orders[0].id;
}
