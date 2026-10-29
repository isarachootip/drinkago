import { buildSignedCustomerUrl } from '../common/password';
import { LineFlexMessage } from './line-flex.templates';

export interface TrackableOrderCardInput {
  id?: string;
  code: string;
  status: string;
  deliveryOtp: string;
  totalSatang?: number;
  expectBagReturn?: number;
}

export interface CustomerTrackingFlexInput {
  customerName: string;
  lineUserId: string;
  oaBasicId: string;
  publicWebUrl: string;
  liffId?: string | null;
  rawSecret?: string;
  bagBalance: number;
  orders: TrackableOrderCardInput[];
}

export interface ThaiOrderProgress {
  step: number;
  totalSteps: 8;
  label: string;
  badgeText: string;
  headerBg: string;
  progressPercent: number;
}

const TERMINAL_STATUSES = new Set(['CLOSED', 'CLOSED_WITH_RETURN', 'CANCELLED']);
const OTP_VISIBLE_STATUSES = new Set([
  'PENDING', 'CONFIRMED', 'PACKED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'FAILED_DELIVERY',
]);

export function isActiveOrderStatus(status: string): boolean {
  return !TERMINAL_STATUSES.has(status);
}

export function shouldShowDeliveryOtp(status: string): boolean {
  return OTP_VISIBLE_STATUSES.has(status);
}

export function selectOrdersForTracking<T extends { status: string }>(orders: T[], maxActive = 10): T[] {
  if (orders.length === 0) return [];
  const active = orders.filter((o) => isActiveOrderStatus(o.status));
  if (active.length > 0) return active.slice(0, Math.max(1, Math.min(maxActive, 10)));
  return [orders[0]];
}

export function getThaiOrderProgress(status: string): ThaiOrderProgress {
  switch (status) {
    case 'PENDING':
      return { step: 1, totalSteps: 8, label: '1. ส่งคำสั่งซื้อแล้ว รอยืนยัน', badgeText: '⏳ รอรับออเดอร์', headerBg: '#1A56B0', progressPercent: 12 };
    case 'CONFIRMED':
      return { step: 2, totalSteps: 8, label: '2. รับคำสั่งซื้อแล้ว รอไรเดอร์ไปกดน้ำ', badgeText: '📋 รับออเดอร์แล้ว', headerBg: '#1A56B0', progressPercent: 25 };
    case 'PACKED':
      return { step: 3, totalSteps: 8, label: '3. พนักงานกำลังกดน้ำ / จัดเตรียมสินค้า', badgeText: '🚰 กำลังกดน้ำ', headerBg: '#0B6E8A', progressPercent: 38 };
    case 'PICKED_UP':
      return { step: 4, totalSteps: 8, label: '4. ไรเดอร์รับน้ำขึ้นรถเรียบร้อยแล้ว', badgeText: '📦 รับสินค้าแล้ว', headerBg: '#0B6E8A', progressPercent: 50 };
    case 'OUT_FOR_DELIVERY':
      return { step: 5, totalSteps: 8, label: '5. ไรเดอร์กำลังวิ่งส่งน้ำถึงหน้าบ้านคุณ', badgeText: '🛵 กำลังจัดส่ง', headerBg: '#1E7B45', progressPercent: 68 };
    case 'FAILED_DELIVERY':
      return { step: 5, totalSteps: 8, label: '5. จัดส่งไม่สำเร็จ รอนัดหมายส่งใหม่อีกครั้ง', badgeText: '⚠️ รอนัดส่งใหม่', headerBg: '#B45309', progressPercent: 62 };
    case 'DELIVERED':
      return { step: 6, totalSteps: 8, label: '6. จัดส่งน้ำดื่มถึงมือคุณเรียบร้อยแล้ว', badgeText: '✅ ส่งน้ำสำเร็จ', headerBg: '#17613A', progressPercent: 80 };
    case 'BAG_COLLECTED':
    case 'BAG_RETURNED':
      return { step: 7, totalSteps: 8, label: '7. รับถุงหมุนเวียนคืนแล้ว อยู่ระหว่างตรวจนับ', badgeText: '🔄 รับถุงคืนแล้ว', headerBg: '#17613A', progressPercent: 90 };
    case 'CLOSED':
    case 'CLOSED_WITH_RETURN':
      return { step: 8, totalSteps: 8, label: '8. จัดส่งและบันทึกถุงคืนเสร็จสมบูรณ์', badgeText: '✅ จบงานสมบูรณ์', headerBg: '#0F2236', progressPercent: 100 };
    case 'CANCELLED':
      return { step: 0, totalSteps: 8, label: 'คำสั่งซื้อนี้ถูกยกเลิกแล้ว', badgeText: '❌ ยกเลิกแล้ว', headerBg: '#64748B', progressPercent: 0 };
    default:
      return { step: 1, totalSteps: 8, label: `สถานะ: ${status}`, badgeText: '📦 ติดตามสถานะ', headerBg: '#0F2236', progressPercent: 15 };
  }
}

export function buildTrackDeepLinkUrl(input: {
  publicWebUrl: string;
  liffId?: string | null;
  lineUserId: string;
  orderId?: string;
  rawSecret?: string;
}): string {
  const cleanLiff = (input.liffId ?? '').trim();
  const orderParam = input.orderId ? `&orderId=${encodeURIComponent(input.orderId)}` : '';
  if (cleanLiff) {
    return `https://liff.line.me/${encodeURIComponent(cleanLiff)}?tab=track${orderParam}`;
  }
  return `${buildSignedCustomerUrl(input.publicWebUrl, input.lineUserId, input.rawSecret)}&tab=track${orderParam}`;
}

const formatBahtText = (satang?: number): string | null => {
  if (typeof satang !== 'number') return null;
  const b = satang / 100;
  return `฿${Number.isInteger(b) ? `${b}` : b.toFixed(2)}`;
};

function buildSingleOrderBubble(input: CustomerTrackingFlexInput, order: TrackableOrderCardInput): Record<string, unknown> {
  const prog = getThaiOrderProgress(order.status);
  const trackUrl = buildTrackDeepLinkUrl({
    publicWebUrl: input.publicWebUrl, liffId: input.liffId, lineUserId: input.lineUserId, orderId: order.id, rawSecret: input.rawSecret,
  });
  const baht = formatBahtText(order.totalSatang);
  const otpBlock = shouldShowDeliveryOtp(order.status)
    ? [{
        type: 'box', layout: 'vertical', backgroundColor: '#FFF9C4', cornerRadius: '10px', paddingAll: '10px', margin: 'sm',
        contents: [
          { type: 'text', text: '🔑 รหัส OTP 4 หลักแจ้งไรเดอร์เมื่อรับน้ำ', size: 'xs', color: '#64748B', align: 'center' },
          { type: 'text', text: order.deliveryOtp, size: 'xxl', weight: 'bold', color: '#B45309', align: 'center' },
        ],
      }]
    : [{
        type: 'text',
        text: order.status === 'CANCELLED' ? 'ℹ️ ออเดอร์นี้ถูกยกเลิกแล้ว (กดสั่งน้ำรอบใหม่ได้ด้านล่าง)' : '✅ ส่งมอบน้ำดื่มเรียบร้อยแล้ว (ซ่อนรหัส OTP)',
        size: 'xs', color: order.status === 'CANCELLED' ? '#64748B' : '#1E7B45', wrap: true, margin: 'sm',
      }];

  return {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: prog.headerBg, paddingAll: '12px',
      contents: [
        { type: 'text', text: `${prog.badgeText} · #${order.code}`, weight: 'bold', size: 'sm', color: '#FFFFFF', wrap: true },
        ...(baht ? [{ type: 'text', text: `ยอดรวม ${baht} · คุณ ${input.customerName}`, size: 'xxs', color: '#E2E8F0' }] : []),
      ],
    },
    body: {
      type: 'box', layout: 'vertical', spacing: 'xs', paddingAll: '12px',
      contents: [
        { type: 'text', text: prog.label, size: 'xs', weight: 'bold', color: '#0F2236', wrap: true },
        ...(prog.step > 0 ? [{
          type: 'box', layout: 'vertical', backgroundColor: '#E2E8F0', height: '8px', cornerRadius: '4px', margin: 'xs',
          contents: [{ type: 'box', layout: 'vertical', backgroundColor: prog.headerBg, height: '8px', cornerRadius: '4px', width: `${prog.progressPercent}%`, contents: [] }],
        }, { type: 'text', text: `ความคืบหน้า: ขั้นที่ ${prog.step} จาก ${prog.totalSteps}`, size: 'xxs', color: '#475569' }] : []),
        ...otpBlock,
        { type: 'separator', margin: 'md' },
        { type: 'text', text: `🛍️ ยอดถุงค้างสะสมของคุณ: ${input.bagBalance} ใบ`, size: 'xs', weight: 'bold', color: '#C2255C', margin: 'xs' },
      ],
    },
    footer: {
      type: 'box', layout: 'vertical', spacing: 'xs', paddingAll: '10px',
      contents: [
        { type: 'button', style: 'primary', color: '#1A56B0', height: 'sm', action: { type: 'uri', label: '🌐 ดูไทม์ไลน์ละเอียด', uri: trackUrl } },
        { type: 'button', style: 'secondary', height: 'sm', action: { type: 'postback', label: '🛒 สั่งน้ำดื่มเพิ่ม', data: 'action=menu', displayText: 'สั่งน้ำดื่ม' } },
      ],
    },
  };
}

export function buildCustomerTrackingFlex(input: CustomerTrackingFlexInput): LineFlexMessage {
  const selected = selectOrdersForTracking(input.orders);
  if (selected.length === 0) {
    const emptyTrackUrl = buildTrackDeepLinkUrl({
      publicWebUrl: input.publicWebUrl, liffId: input.liffId, lineUserId: input.lineUserId, rawSecret: input.rawSecret,
    });
    return {
      type: 'flex',
      altText: `สถานะออเดอร์และยอดถุงค้าง (${input.bagBalance} ใบ)`,
      contents: {
        type: 'bubble', size: 'kilo',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#0F2236', contents: [{ type: 'text', text: `💧 Drink&Go (${input.oaBasicId})`, weight: 'bold', size: 'sm', color: '#FFFFFF' }] },
        body: {
          type: 'box', layout: 'vertical', spacing: 'xs',
          contents: [
            { type: 'text', text: `สวัสดีคุณ ${input.customerName}`, size: 'sm', weight: 'bold' },
            { type: 'separator', margin: 'sm' },
            { type: 'text', text: '📋 ยังไม่มีประวัติคำสั่งซื้อ กดดูเมนูเพื่อสั่งน้ำดื่มได้เลยครับ', size: 'xs', color: '#64748B', wrap: true },
            { type: 'separator', margin: 'sm' },
            { type: 'text', text: `🛍️ ยอดถุงค้างสะสม: ${input.bagBalance} ใบ`, size: 'sm', weight: 'bold', color: '#C2255C' },
          ],
        },
        footer: {
          type: 'box', layout: 'vertical', spacing: 'xs',
          contents: [
            { type: 'button', style: 'primary', color: '#1A56B0', height: 'sm', action: { type: 'postback', label: '🛒 ดูเมนูสั่งน้ำดื่ม', data: 'action=menu' } },
            { type: 'button', style: 'secondary', height: 'sm', action: { type: 'uri', label: '🌐 เปิดหน้าเว็บติดตามสถานะ', uri: emptyTrackUrl } },
          ],
        },
      },
    };
  }
  const bubbles = selected.map((o) => buildSingleOrderBubble(input, o));
  return {
    type: 'flex',
    altText: `📦 ติดตามสถานะออเดอร์ (${selected.length} รายการ) · ถุงค้าง ${input.bagBalance} ใบ`,
    contents: bubbles.length === 1 ? bubbles[0] : { type: 'carousel', contents: bubbles },
  };
}
