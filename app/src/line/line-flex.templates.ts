import { LineCartItem } from '../db/schema';
export { buildOrderTicketFlex, buildStatusAndBagFlex } from './line-ticket.templates';

export interface LineAction {
  type: 'postback' | 'message' | 'uri' | 'location';
  label: string;
  data?: string;
  displayText?: string;
  text?: string;
  uri?: string;
}

export interface LineQuickReplyItem {
  type: 'action';
  action: LineAction;
}

export interface LineTextMessage {
  type: 'text';
  text: string;
  quickReply?: { items: LineQuickReplyItem[] };
}

export interface LineFlexMessage {
  type: 'flex';
  altText: string;
  contents: Record<string, unknown>;
  quickReply?: { items: LineQuickReplyItem[] };
}

export type LineMessage = LineTextMessage | LineFlexMessage;

export interface ProductFlexItem {
  id: number;
  sku: string;
  name: string;
  priceSatang: number;
  isReturnable: boolean;
  imageUrl?: string | null;
}

export interface OrderTicketFlexInput {
  orderCode: string;
  deliveryOtp: string;
  customerName: string;
  addressDetail: string;
  items: LineCartItem[];
  totalSatang: number;
  expectBagReturn: number;
  paymentMethod: 'CASH' | 'PROMPTPAY' | 'CREDIT';
  promptpayId: string;
  promptpayAccountName: string;
  publicWebUrl: string;
  lineUserId: string;
}

const FALLBACK_WATER_IMAGE =
  'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=600&q=80';

const formatBahtNum = (satang: number): string => {
  const b = satang / 100;
  return Number.isInteger(b) ? `${b}` : b.toFixed(2);
};

export function getSafeProductImageUrl(url: string | null | undefined, baseUrl: string): string {
  if (!url || !url.trim()) return FALLBACK_WATER_IMAGE;
  let target = url.trim();
  if (target.startsWith('/')) {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    target = `${cleanBase}${target}`;
  }
  try {
    const parsed = new URL(target);
    if ((parsed.protocol === 'https:' || parsed.hostname === 'localhost') && parsed.href.length < 1000) {
      return parsed.href;
    }
  } catch {
    return FALLBACK_WATER_IMAGE;
  }
  return FALLBACK_WATER_IMAGE;
}

export function buildProductCarouselFlex(products: ProductFlexItem[], baseUrl: string): LineFlexMessage {
  const bubbles = products.slice(0, 12).map((p) => ({
    type: 'bubble',
    size: 'kilo',
    hero: {
      type: 'image',
      url: getSafeProductImageUrl(p.imageUrl, baseUrl),
      size: 'full',
      aspectMode: 'cover',
      aspectRatio: '20:13',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      spacing: 'xs',
      contents: [
        { type: 'text', text: p.name, weight: 'bold', size: 'md', wrap: true },
        {
          type: 'text',
          text: p.isReturnable ? '🔄 มีถุงหมุนเวียน (รับคืนถุง)' : '📦 แพ็กเกจไม่ต้องคืนถุง',
          size: 'xs',
          color: p.isReturnable ? '#0B6E8A' : '#64748B',
        },
        {
          type: 'text',
          text: `฿${formatBahtNum(p.priceSatang)}`,
          size: 'xl',
          weight: 'bold',
          color: '#1A56B0',
          margin: 'sm',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '10px',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#1A56B0',
          height: 'sm',
          action: {
            type: 'postback',
            label: '🛒 ใส่ตะกร้าเลย',
            data: `action=quick_add&productId=${p.id}`,
            displayText: `สั่ง ${p.name}`,
          },
        },
      ],
    },
  }));

  return {
    type: 'flex',
    altText: '💧 เมนูสั่งน้ำดื่ม Drink&Go (Delivery)',
    contents: { type: 'carousel', contents: bubbles },
  };
}

export function buildCartFlex(items: LineCartItem[]): LineFlexMessage {
  const totalSatang = items.reduce((sum, i) => sum + i.priceSatang * i.qty, 0);
  const rows = items.map((item) => ({
    type: 'box',
    layout: 'horizontal',
    alignItems: 'center',
    margin: 'md',
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        flex: 4,
        contents: [
          { type: 'text', text: item.name, size: 'sm', weight: 'bold', color: '#1E293B', wrap: true },
          { type: 'text', text: `฿${formatBahtNum(item.priceSatang * item.qty)}`, size: 'xs', color: '#1A56B0' },
        ],
      },
      {
        type: 'box',
        layout: 'horizontal',
        flex: 3,
        spacing: 'xs',
        alignItems: 'center',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            flex: 1,
            action: { type: 'postback', label: '-', data: `action=decrease&productId=${item.productId}` },
          },
          { type: 'text', text: `${item.qty}`, size: 'sm', weight: 'bold', align: 'center', flex: 1 },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            flex: 1,
            action: { type: 'postback', label: '+', data: `action=increase&productId=${item.productId}` },
          },
        ],
      },
    ],
  }));

  return {
    type: 'flex',
    altText: `🛒 ตะกร้าสินค้า (รวม ฿${formatBahtNum(totalSatang)})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#E6EEF9',
        contents: [{ type: 'text', text: '🛒 ตะกร้าสินค้า (Delivery)', weight: 'bold', size: 'lg', color: '#1A56B0' }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          ...rows,
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              { type: 'text', text: 'ยอดรวมจัดส่ง', weight: 'bold', size: 'md', flex: 2 },
              { type: 'text', text: `฿${formatBahtNum(totalSatang)}`, weight: 'bold', size: 'lg', align: 'end', color: '#1A56B0', flex: 1 },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#1E7B45',
            height: 'sm',
            action: { type: 'postback', label: '✅ ยืนยันการสั่งซื้อ', data: 'action=checkout', displayText: 'ยืนยันการสั่งซื้อ' },
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              { type: 'button', style: 'secondary', height: 'sm', flex: 1, action: { type: 'message', label: '➕ เลือกเพิ่ม', text: 'เมนู' } },
              { type: 'button', style: 'secondary', height: 'sm', flex: 1, action: { type: 'postback', label: '🗑️ ล้างตะกร้า', data: 'action=clear_cart' } },
            ],
          },
        ],
      },
    },
  };
}
