import { LineFlexMessage, LineMessage } from './line-flex.templates';

export interface ShareOaFlexInput {
  oaBasicId: string;
  publicWebUrl: string;
}

export function normalizeOaBasicId(oaBasicId: string): string {
  const clean = (oaBasicId.trim() || '@157iywjs').replace(/^@+/, '').replace(/[^a-zA-Z0-9._-]/g, '');
  return `@${clean || '157iywjs'}`;
}

export function buildShareOaFlex(input: ShareOaFlexInput): LineFlexMessage {
  const oaId = normalizeOaBasicId(input.oaBasicId);
  const addFriendUrl = `https://line.me/R/ti/p/${oaId}`;
  const recommendOaUrl = `https://line.me/R/nv/recommendOA/${oaId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(addFriendUrl)}`;

  return {
    type: 'flex',
    altText: `📲 แชร์ LINE OA (${oaId}) และสแกน QR Code เพื่อเพิ่มเพื่อน`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#06C755',
        paddingAll: '12px',
        contents: [
          {
            type: 'text',
            text: '🤝 แนะนำเพื่อน / แชร์ LINE OA',
            weight: 'bold',
            size: 'md',
            color: '#FFFFFF',
            align: 'center',
          },
          {
            type: 'text',
            text: `LINE ID: ${oaId}`,
            size: 'xs',
            color: '#E8FDF0',
            align: 'center',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        alignItems: 'center',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: 'สแกนคิวอาร์โค้ดเพื่อเพิ่มเพื่อน',
            weight: 'bold',
            size: 'md',
            color: '#0F2236',
            align: 'center',
          },
          {
            type: 'text',
            text: 'ให้เพื่อนสแกนจากหน้าจอนี้ หรือกดปุ่มแชร์ด้านล่างได้เลยครับ',
            size: 'xs',
            color: '#64748B',
            align: 'center',
            wrap: true,
          },
          {
            type: 'image',
            url: qrImageUrl,
            size: 'xl',
            aspectRatio: '1:1',
            aspectMode: 'fit',
            margin: 'md',
            action: {
              type: 'uri',
              label: 'เปิด QR Code',
              uri: addFriendUrl,
            },
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            height: 'sm',
            action: {
              type: 'uri',
              label: '📲 แชร์นามบัตรร้านให้เพื่อน',
              uri: recommendOaUrl,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '🔍 เปิดหน้า QR Code เต็มจอ',
              uri: addFriendUrl,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '🛒 ดูเมนูสั่งน้ำดื่ม',
              data: 'action=menu',
              displayText: 'ดูเมนูสั่งน้ำ',
            },
          },
        ],
      },
    },
  };
}

export function buildContactAndShareMessages(input: ShareOaFlexInput): LineMessage[] {
  const oaId = normalizeOaBasicId(input.oaBasicId);
  return [
    {
      type: 'text',
      text: [
        `📍 ติดต่อเรา — ilife / Drink&Go (${oaId})`,
        '💧 บริการจัดส่งน้ำดื่มอัลคาไลน์ ไฮโดรเจน ถึงบ้านพร้อมรับถุงหมุนเวียนคืน',
        `🌐 เว็บไซต์: ${input.publicWebUrl}`,
        '💬 พิมพ์ "เมนู" เพื่อสั่งน้ำ หรือส่งต่อ QR Code ด้านล่างให้เพื่อนได้เลยครับ',
      ].join('\n'),
    },
    buildShareOaFlex(input),
  ];
}
