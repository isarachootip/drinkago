import { buildSignedCustomerUrl } from '../common/password';
import { getStationRegionMeta, inferStationRegion, STATION_REGIONS, StationRegion } from '../stations/station-regions';
import { LineFlexMessage, LineQuickReplyItem } from './line-flex.templates';

export interface StationFlexItem {
  id: number;
  code: string;
  name: string;
  addressDetail: string;
  region?: string;
  lat: number;
  lng: number;
  bagBalance?: number;
  distanceKm?: number;
}

export interface StationsCarouselOptions {
  subtitle?: string;
  region?: StationRegion;
  publicWebUrl?: string;
  lineUserId?: string;
}

export function buildStationsWebUrl(
  publicWebUrl = 'https://idrink.tamadee.online',
  lineUserId?: string,
  region?: StationRegion,
): string {
  const baseUrl = lineUserId ? buildSignedCustomerUrl(publicWebUrl, lineUserId) : publicWebUrl;
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}tab=stations${region ? `&region=${encodeURIComponent(region)}` : ''}`;
}

export function buildStationRegionPickerFlex(
  stations: StationFlexItem[],
  publicWebUrl = 'https://idrink.tamadee.online',
  lineUserId?: string,
): LineFlexMessage {
  const counts: Record<StationRegion, number> = { BANGKOK: 0, CENTRAL: 0, NORTH: 0, NORTHEAST: 0, EAST: 0, SOUTH: 0 };
  for (const s of stations) {
    const reg = s.region ? getStationRegionMeta(s.region).code : inferStationRegion(s.name, s.addressDetail);
    counts[reg] += 1;
  }

  const webUrl = buildStationsWebUrl(publicWebUrl, lineUserId);
  const regionButtons = STATION_REGIONS.map((code) => {
    const meta = getStationRegionMeta(code);
    const isBkk = code === 'BANGKOK';
    return {
      type: 'button',
      style: isBkk ? 'primary' : 'secondary',
      ...(isBkk ? { color: '#0B6E8A' } : {}),
      height: 'sm',
      action: {
        type: 'postback',
        label: `${meta.emoji} ${meta.label} (${counts[code]} สาขา)`.slice(0, 40),
        data: `action=stations_by_region&region=${code}`,
        displayText: `ค้นหาตู้เติมน้ำ: ${meta.label}`,
      },
    };
  });

  return {
    type: 'flex',
    altText: `📍 ค้นหาตู้เติมน้ำทั่วไทย (${stations.length} สาขา)`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0B6E8A',
        paddingAll: '14px',
        contents: [
          { type: 'text', text: '📍 ค้นหาตู้เติมน้ำทั่วไทย', weight: 'bold', size: 'md', color: '#FFFFFF' },
          { type: 'text', text: `รวม ${stations.length} สาขา · เลือกกรุงเทพฯ หรือภูมิภาคที่ต้องการ`, size: 'xs', color: '#E0F2FE', wrap: true },
        ],
      },
      body: { type: 'box', layout: 'vertical', spacing: 'xs', paddingAll: '14px', contents: regionButtons },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '10px',
        contents: [
          { type: 'button', style: 'link', height: 'sm', action: { type: 'uri', label: '🌐 ดูและค้นหาทุกสาขาบนเว็บ', uri: webUrl } },
        ],
      },
    },
    quickReply: {
      items: [
        { type: 'action', action: { type: 'location', label: '📍 หาตู้ใกล้ฉัน' } },
        { type: 'action', action: { type: 'postback', label: '💧 สั่งน้ำดื่ม', data: 'action=menu', displayText: 'สั่งน้ำดื่ม' } },
      ],
    },
  };
}

export function buildStationsCarouselFlex(
  stations: StationFlexItem[],
  subtitleOrOptions: string | StationsCarouselOptions = 'ค้นหาตู้เติมน้ำทั่วไทย',
): LineFlexMessage {
  const opts: StationsCarouselOptions = typeof subtitleOrOptions === 'string' ? { subtitle: subtitleOrOptions } : subtitleOrOptions;
  const subtitle = opts.subtitle ?? (opts.region ? getStationRegionMeta(opts.region).label : 'ค้นหาตู้เติมน้ำทั่วไทย');
  const webUrl = buildStationsWebUrl(opts.publicWebUrl, opts.lineUserId, opts.region);

  const quickItems: LineQuickReplyItem[] = [
    { type: 'action', action: { type: 'location', label: '📍 หาตู้ใกล้ฉัน' } },
    { type: 'action', action: { type: 'postback', label: '🗺️ เลือกภาคอื่น', data: 'action=find_stations', displayText: 'ค้นหาตู้เติมน้ำทั่วไทย' } },
    ...(opts.publicWebUrl ? [{ type: 'action' as const, action: { type: 'uri' as const, label: '🌐 ดูบนเว็บทั้งหมด', uri: webUrl } }] : []),
    { type: 'action', action: { type: 'postback', label: '💧 สั่งน้ำดื่ม', data: 'action=menu', displayText: 'สั่งน้ำดื่ม' } },
  ];

  if (stations.length === 0) {
    return {
      type: 'flex',
      altText: `📍 ${subtitle} (ยังไม่มีสาขา)`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: { type: 'box', layout: 'vertical', backgroundColor: '#0B6E8A', paddingAll: '12px', contents: [{ type: 'text', text: `📍 ${subtitle}`, weight: 'bold', size: 'sm', color: '#FFFFFF' }] },
        body: {
          type: 'box', layout: 'vertical', spacing: 'xs', paddingAll: '14px',
          contents: [
            { type: 'text', text: 'ขณะนี้ยังไม่มีตู้เติมน้ำเปิดให้บริการในโซนนี้', size: 'sm', weight: 'bold', wrap: true },
            { type: 'text', text: 'สามารถเลือกดูโซนอื่น หรือกดแชร์พิกัดเพื่อหาตู้ใกล้คุณได้ครับ', size: 'xs', color: '#64748B', wrap: true },
          ],
        },
        footer: {
          type: 'box', layout: 'vertical', paddingAll: '10px',
          contents: [{ type: 'button', style: 'primary', color: '#0B6E8A', height: 'sm', action: { type: 'postback', label: '🗺️ เลือกภูมิภาคอื่น', data: 'action=find_stations', displayText: 'ค้นหาตู้เติมน้ำทั่วไทย' } }],
        },
      },
      quickReply: { items: quickItems },
    };
  }

  const hasOverflow = stations.length > 12;
  const visible = hasOverflow ? stations.slice(0, 11) : stations.slice(0, 12);
  const bubbles: Record<string, unknown>[] = visible.map((s) => {
    const regMeta = getStationRegionMeta(s.region ?? inferStationRegion(s.name, s.addressDetail));
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.lat},${s.lng}`)}`;
    return {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: regMeta.color, paddingAll: '10px',
        contents: [
          { type: 'text', text: `🚰 ${s.name}`, weight: 'bold', size: 'sm', color: '#FFFFFF', wrap: true },
          { type: 'text', text: `${regMeta.emoji} ${regMeta.shortLabel} · รหัส: ${s.code}`, size: 'xs', color: '#E0F2FE' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'xs', paddingAll: '12px',
        contents: [
          ...(s.distanceKm !== undefined ? [{ type: 'text', text: `📏 ห่างจากคุณประมาณ ${s.distanceKm.toFixed(1)} กม.`, size: 'xs', weight: 'bold', color: '#1E7B45' }] : []),
          { type: 'text', text: `📍 ${s.addressDetail}`, size: 'xs', color: '#33475B', wrap: true },
          ...(s.bagBalance !== undefined ? [{ type: 'text', text: `🛍️ สต็อกถุงพร้อมจ่าย: ${s.bagBalance} ใบ`, size: 'xs', color: '#1A56B0' }] : []),
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', paddingAll: '10px',
        contents: [{ type: 'button', style: 'primary', color: regMeta.color, height: 'sm', action: { type: 'uri', label: '🗺️ นำทาง Google Maps', uri: mapUrl } }],
      },
    };
  });

  if (hasOverflow) {
    const remaining = stations.length - visible.length;
    bubbles.push({
      type: 'bubble',
      size: 'kilo',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#1A56B0', paddingAll: '10px', contents: [{ type: 'text', text: `🌐 ดูสาขาเพิ่มเติม (+${remaining})`, weight: 'bold', size: 'sm', color: '#FFFFFF' }] },
      body: {
        type: 'box', layout: 'vertical', spacing: 'xs', paddingAll: '12px',
        contents: [
          { type: 'text', text: `ยังมีตู้เติมน้ำในโซน ${subtitle} อีก ${remaining} สาขา`, size: 'xs', weight: 'bold', wrap: true },
          { type: 'text', text: 'กดเปิดหน้าเว็บเพื่อค้นหาชื่อเขต/จังหวัด และดูพิกัดครบทุกสาขา', size: 'xs', color: '#475569', wrap: true },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', paddingAll: '10px',
        contents: [{ type: 'button', style: 'primary', color: '#1A56B0', height: 'sm', action: { type: 'uri', label: `🌐 ดูครบทั้ง ${stations.length} สาขา`, uri: webUrl } }],
      },
    });
  }

  return { type: 'flex', altText: `📍 ${subtitle} (${stations.length} สาขา)`, contents: { type: 'carousel', contents: bubbles }, quickReply: { items: quickItems } };
}
