import { buildSignedCustomerUrl } from '../common/password';
import { MeetupEventItem } from '../events/meetup-events.service';
import { LineFlexMessage } from './line-flex.templates';
import { normalizeOaBasicId } from './line-share.templates';

export interface StationFlexItem {
  id: number;
  code: string;
  name: string;
  addressDetail: string;
  lat: number;
  lng: number;
  bagBalance?: number;
  distanceKm?: number;
}

export interface VisitUsFlexInput {
  oaBasicId: string;
  publicWebUrl: string;
  facebookUrl: string;
}

export function buildMeetupEventsFlex(
  events: MeetupEventItem[],
  publicWebUrl: string,
  lineUserId?: string,
): LineFlexMessage {
  const baseCustomerUrl = lineUserId ? buildSignedCustomerUrl(publicWebUrl, lineUserId) : publicWebUrl;
  const webEventsUrl = `${baseCustomerUrl}${baseCustomerUrl.includes('?') ? '&' : '?'}tab=events`;

  if (events.length === 0) {
    return {
      type: 'flex',
      altText: '📅 ตารางกิจกรรมพบปะทีม ilife',
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#7C3AED',
          contents: [{ type: 'text', text: '📅 กิจกรรมพบปะทีม ilife', weight: 'bold', size: 'md', color: '#FFFFFF' }],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text', text: 'ขณะนี้ยังไม่มีกำหนดการกิจกรรมพบปะใหม่', size: 'sm', weight: 'bold', wrap: true },
            { type: 'text', text: 'สามารถติดตามอัปเดตตารางกิจกรรมผ่านหน้าเว็บหรือสั่งน้ำดื่มได้เลยครับ', size: 'xs', color: '#64748B', wrap: true },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'xs',
          contents: [
            { type: 'button', style: 'primary', color: '#7C3AED', height: 'sm', action: { type: 'uri', label: '🌐 ดูหน้าตารางกิจกรรม', uri: webEventsUrl } },
            { type: 'button', style: 'secondary', height: 'sm', action: { type: 'postback', label: '💧 สั่งน้ำดื่ม', data: 'action=menu', displayText: 'สั่งน้ำดื่ม' } },
          ],
        },
      },
    };
  }

  const bubbles = events.slice(0, 10).map((ev) => ({
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#7C3AED',
      paddingAll: '12px',
      contents: [
        { type: 'text', text: '📅 กิจกรรมพบปะทีม ilife', weight: 'bold', size: 'sm', color: '#E9D5FF' },
        { type: 'text', text: ev.title, weight: 'bold', size: 'md', color: '#FFFFFF', wrap: true },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '14px',
      contents: [
        { type: 'text', text: `🗓️ วันจัดงาน: ${ev.eventDate}`, size: 'sm', weight: 'bold', color: '#0F2236', wrap: true },
        { type: 'text', text: `⏰ เวลา: ${ev.eventTime} น.`, size: 'sm', weight: 'bold', color: '#7C3AED' },
        { type: 'separator', margin: 'sm' },
        { type: 'text', text: `📍 สถานที่: ${ev.locationName}`, size: 'sm', color: '#1E293B', wrap: true },
        { type: 'text', text: `📞 เบอร์โทร: ${ev.contactPhone}`, size: 'sm', weight: 'bold', color: '#0B6E8A' },
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
          color: '#7C3AED',
          height: 'sm',
          action: { type: 'uri', label: '🗺️ แผนที่สถานที่จัดงาน', uri: ev.mapUrl },
        },
        {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          action: { type: 'uri', label: '🌐 ดูตารางกิจกรรมทั้งหมด', uri: webEventsUrl },
        },
      ],
    },
  }));

  return {
    type: 'flex',
    altText: `📅 ตารางกิจกรรมพบปะทีม ilife (${events.length} รายการ)`,
    contents: { type: 'carousel', contents: bubbles },
  };
}

export function buildStationsCarouselFlex(stations: StationFlexItem[], subtitle = 'ค้นหาตู้เติมน้ำทั่วไทย'): LineFlexMessage {
  const bubbles = stations.slice(0, 12).map((s) => {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.lat},${s.lng}`)}`;
    return {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0B6E8A',
        paddingAll: '10px',
        contents: [
          { type: 'text', text: `🚰 ${s.name}`, weight: 'bold', size: 'sm', color: '#FFFFFF', wrap: true },
          { type: 'text', text: `รหัสสาขา: ${s.code}`, size: 'xs', color: '#E0F2FE' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        paddingAll: '12px',
        contents: [
          ...(s.distanceKm !== undefined
            ? [{ type: 'text', text: `📏 ห่างจากคุณประมาณ ${s.distanceKm.toFixed(1)} กม.`, size: 'xs', weight: 'bold', color: '#1E7B45' }]
            : []),
          { type: 'text', text: `📍 ${s.addressDetail}`, size: 'xs', color: '#33475B', wrap: true },
          ...(s.bagBalance !== undefined
            ? [{ type: 'text', text: `🛍️ สต็อกถุงพร้อมจ่าย: ${s.bagBalance} ใบ`, size: 'xs', color: '#1A56B0' }]
            : []),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        paddingAll: '10px',
        contents: [
          { type: 'button', style: 'primary', color: '#0B6E8A', height: 'sm', action: { type: 'uri', label: '🗺️ นำทาง Google Maps', uri: mapUrl } },
        ],
      },
    };
  });

  return {
    type: 'flex',
    altText: `📍 ${subtitle} (${stations.length} สาขา)`,
    contents: { type: 'carousel', contents: bubbles },
    quickReply: {
      items: [
        { type: 'action', action: { type: 'location', label: '📍 หาตู้ใกล้ฉัน' } },
        { type: 'action', action: { type: 'postback', label: '💧 สั่งน้ำดื่ม', data: 'action=menu', displayText: 'สั่งน้ำดื่ม' } },
      ],
    },
  };
}

export function buildVisitUsFlex(input: VisitUsFlexInput): LineFlexMessage {
  const oaId = normalizeOaBasicId(input.oaBasicId);
  const fbUrl = /^https?:\/\//i.test(input.facebookUrl.trim()) ? input.facebookUrl.trim() : 'https://www.facebook.com';
  return {
    type: 'flex',
    altText: `🔵 เยี่ยมชมเรา — ilife (${oaId})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1877F2',
        paddingAll: '12px',
        contents: [
          { type: 'text', text: '🔵 เยี่ยมชมเรา (Visit Us)', weight: 'bold', size: 'md', color: '#FFFFFF', align: 'center' },
          { type: 'text', text: `ilife · น้ำอัลคาไลน์ ไฮโดรเจน (${oaId})`, size: 'xs', color: '#DBEAFE', align: 'center' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: 'ติดตามข่าวสาร โปรโมชั่น และเรื่องราวสุขภาพดีๆ กับครอบครัว ilife ได้ทุกช่องทาง', size: 'sm', color: '#1E293B', wrap: true, align: 'center' },
          { type: 'text', text: `🌐 เว็บไซต์: ${input.publicWebUrl}`, size: 'xs', color: '#64748B', align: 'center', wrap: true },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        paddingAll: '12px',
        contents: [
          { type: 'button', style: 'primary', color: '#1877F2', height: 'sm', action: { type: 'uri', label: '📘 เปิดเพจ Facebook ของเรา', uri: fbUrl } },
          { type: 'button', style: 'secondary', height: 'sm', action: { type: 'uri', label: '🌐 เข้าสู่เว็บไซต์ ilife', uri: input.publicWebUrl } },
          { type: 'button', style: 'secondary', height: 'sm', action: { type: 'postback', label: '🤝 เป็นเพื่อนกับเรา (แชร์ QR)', data: 'action=share_oa', displayText: 'เป็นเพื่อนกับเรา' } },
        ],
      },
    },
  };
}
