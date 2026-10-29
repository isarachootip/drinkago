import { LineAutoReplyInput } from './line-reply';
import { LineFlexMessage, OrderTicketFlexInput } from './line-flex.templates';
import { buildCustomerTrackingFlex, buildTrackDeepLinkUrl } from './line-status.templates';

const formatBahtNum = (satang: number): string => {
  const b = satang / 100;
  return Number.isInteger(b) ? `${b}` : b.toFixed(2);
};

export function buildOrderTicketFlex(input: OrderTicketFlexInput): LineFlexMessage {
  const totalBaht = formatBahtNum(input.totalSatang);
  const trackUrl = buildTrackDeepLinkUrl({
    publicWebUrl: input.publicWebUrl,
    liffId: input.liffId,
    lineUserId: input.lineUserId,
    orderId: input.orderId,
  });
  const qrUrl = `https://promptpay.io/${encodeURIComponent(input.promptpayId)}/${encodeURIComponent(totalBaht)}.png`;

  const itemLines = input.items.map((item) => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: `${item.name} x${item.qty}`, size: 'xs', color: '#33475B', flex: 4, wrap: true },
      { type: 'text', text: `฿${formatBahtNum(item.priceSatang * item.qty)}`, size: 'xs', color: '#0F2236', align: 'end', flex: 2 },
    ],
  }));

  const paymentBlock =
    input.paymentMethod === 'PROMPTPAY'
      ? [
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'xs',
            alignItems: 'center',
            contents: [
              { type: 'text', text: '📲 สแกนจ่าย PromptPay QR', weight: 'bold', size: 'sm', color: '#1A56B0' },
              { type: 'text', text: `บัญชี: ${input.promptpayAccountName}`, size: 'xs', color: '#4A5B6E' },
              { type: 'image', url: qrUrl, size: 'lg', aspectMode: 'fit', aspectRatio: '1:1', margin: 'sm' },
              {
                type: 'text',
                text: '📸 โอนเสร็จแล้ว ส่งรูปสลิปโอนเงินในห้องแชทนี้ได้เลยครับ',
                size: 'xs',
                color: '#C2255C',
                weight: 'bold',
                align: 'center',
                wrap: true,
              },
            ],
          },
        ]
      : [];

  return {
    type: 'flex',
    altText: `✅ ยืนยันคำสั่งซื้อ #${input.orderCode} (รหัส OTP: ${input.deliveryOtp})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1E7B45',
        contents: [
          { type: 'text', text: '✅ สั่งน้ำดื่มสำเร็จ (Delivery)', weight: 'bold', size: 'md', color: '#FFFFFF', align: 'center' },
          { type: 'text', text: `#${input.orderCode}`, size: 'xs', color: '#E2F8EB', align: 'center' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#FFF9C4',
            cornerRadius: '10px',
            paddingAll: '10px',
            contents: [
              { type: 'text', text: '🔑 รหัส OTP 4 หลักสำหรับแจ้งไรเดอร์', size: 'xs', color: '#64748B', align: 'center' },
              { type: 'text', text: input.deliveryOtp, size: '3xl', weight: 'bold', color: '#B45309', align: 'center' },
            ],
          },
          { type: 'text', text: `📍 จัดส่งที่: ${input.addressDetail}`, size: 'xs', color: '#33475B', wrap: true, margin: 'sm' },
          ...(input.stationName ? [{ type: 'text', text: `🚰 ตู้กดน้ำต้นทาง: ${input.stationName}`, size: 'xs', color: '#0B6E8A', weight: 'bold', wrap: true }] : []),
          { type: 'text', text: `🛍️ แจ้งคืนถุงรอบนี้: ${input.expectBagReturn} ใบ`, size: 'xs', color: '#0B6E8A' },
          { type: 'separator', margin: 'md' },
          ...itemLines,
          { type: 'separator', margin: 'md' },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: `รวม (${input.paymentMethod})`, size: 'sm', weight: 'bold', flex: 3 },
              { type: 'text', text: `฿${totalBaht}`, size: 'md', weight: 'bold', color: '#1E7B45', align: 'end', flex: 2 },
            ],
          },
          ...paymentBlock,
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: { type: 'uri', label: '📦 ติดตามสถานะการจัดส่ง', uri: trackUrl },
          },
          ...(input.orderId
            ? [{
                type: 'button',
                style: 'secondary',
                height: 'sm',
                action: { type: 'postback', label: '❌ ยกเลิกคำสั่งซื้อ', data: `action=cancel_order&orderId=${input.orderId}`, displayText: 'ยกเลิกคำสั่งซื้อ' },
              }]
            : []),
        ],
      },
    },
  };
}

export function buildStatusAndBagFlex(input: LineAutoReplyInput & { liffId?: string | null }): LineFlexMessage {
  return buildCustomerTrackingFlex({
    customerName: input.customerName,
    lineUserId: input.lineUserId,
    oaBasicId: input.oaBasicId,
    publicWebUrl: input.publicWebUrl,
    liffId: input.liffId,
    bagBalance: input.bagBalance,
    orders: input.latestOrder ? [input.latestOrder] : [],
  });
}
