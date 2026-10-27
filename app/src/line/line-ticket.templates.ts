import { LineAutoReplyInput } from './line-reply';
import { LineFlexMessage, OrderTicketFlexInput } from './line-flex.templates';

const formatBahtNum = (satang: number): string => {
  const b = satang / 100;
  return Number.isInteger(b) ? `${b}` : b.toFixed(2);
};

export function buildOrderTicketFlex(input: OrderTicketFlexInput): LineFlexMessage {
  const totalBaht = formatBahtNum(input.totalSatang);
  const cleanWeb = input.publicWebUrl.replace(/\/+$/, '');
  const trackUrl = `${cleanWeb}/?lineUserId=${encodeURIComponent(input.lineUserId)}`;
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
        contents: [
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: { type: 'uri', label: '📦 ติดตามสถานะการจัดส่ง', uri: trackUrl },
          },
        ],
      },
    },
  };
}

export function buildStatusAndBagFlex(input: LineAutoReplyInput): LineFlexMessage {
  const cleanWeb = input.publicWebUrl.replace(/\/+$/, '');
  const trackUrl = `${cleanWeb}/?lineUserId=${encodeURIComponent(input.lineUserId)}`;
  const orderSection = input.latestOrder
    ? [
        { type: 'text', text: `📦 ออเดอร์ล่าสุด: #${input.latestOrder.code}`, size: 'sm', weight: 'bold', color: '#0F2236' },
        { type: 'text', text: `สถานะ: ${input.latestOrder.status}`, size: 'xs', color: '#1A56B0' },
        { type: 'text', text: `🔑 รหัส OTP แจ้งไรเดอร์: ${input.latestOrder.deliveryOtp}`, size: 'md', weight: 'bold', color: '#B45309', margin: 'xs' },
      ]
    : [{ type: 'text', text: '📋 ยังไม่มีประวัติคำสั่งซื้อ กดดูเมนูเพื่อสั่งน้ำดื่มได้เลยครับ', size: 'xs', color: '#64748B', wrap: true }];

  return {
    type: 'flex',
    altText: `สถานะออเดอร์และยอดถุงค้าง (${input.bagBalance} ใบ)`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0F2236',
        contents: [{ type: 'text', text: `💧 Drink&Go (${input.oaBasicId})`, weight: 'bold', size: 'sm', color: '#FFFFFF' }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          { type: 'text', text: `สวัสดีคุณ ${input.customerName}`, size: 'sm', weight: 'bold' },
          { type: 'separator', margin: 'sm' },
          ...orderSection,
          { type: 'separator', margin: 'sm' },
          { type: 'text', text: `🛍️ ยอดถุงค้างสะสม: ${input.bagBalance} ใบ`, size: 'sm', weight: 'bold', color: '#C2255C' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          { type: 'button', style: 'primary', color: '#1A56B0', height: 'sm', action: { type: 'postback', label: '🛒 ดูเมนูสั่งน้ำดื่ม', data: 'action=menu' } },
          { type: 'button', style: 'secondary', height: 'sm', action: { type: 'uri', label: '🌐 เปิดหน้าเว็บติดตามสถานะ', uri: trackUrl } },
        ],
      },
    },
  };
}
