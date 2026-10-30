import React from 'react';
import { RiderJob } from '../api/schemas';
import { buildCustomerMapsUrl, buildStationMapsUrl } from '../domain/navigation';
import { RiderTargetLocation } from '../domain/rider-steps';

interface Props {
  job: RiderJob;
  targetLocation: RiderTargetLocation;
}

export const RiderMapNavBox: React.FC<Props> = ({ job, targetLocation }) => {
  const stationHighlight = targetLocation === 'station';
  const customerHighlight = targetLocation === 'customer';
  const stationMapsUrl = buildStationMapsUrl(job.station);
  const customerMaps = buildCustomerMapsUrl(job.address);

  return (
    <div
      style={{
        background: '#F8FAFC',
        border: '1px solid #DCE4EC',
        borderRadius: 12,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
        <span style={{ fontWeight: 700, color: stationHighlight ? '#0B6E8A' : '#058C3B' }}>
          {stationHighlight
            ? '🗺️ นำทาง Google Maps: ไปตู้กดน้ำก่อน (ขั้นที่ 1–3)'
            : '🗺️ นำทาง Google Maps: ไปส่งที่บ้านลูกค้า (ขั้นที่ 4–5)'}
        </span>
        {job.customerPhone && (
          <a
            href={`tel:${job.customerPhone}`}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#0F2236',
              textDecoration: 'none',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              padding: '4px 9px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
            }}
          >
            📞 โทรหาลูกค้า
          </a>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {stationMapsUrl && (
          <a
            href={stationMapsUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: '1 1 140px',
              minHeight: 44,
              borderRadius: 10,
              background: stationHighlight ? '#0B6E8A' : '#FFFFFF',
              color: stationHighlight ? '#FFFFFF' : '#475569',
              border: stationHighlight ? 'none' : '1px dashed #CBD5E1',
              fontSize: 12,
              fontWeight: stationHighlight ? 700 : 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '4px 10px',
              boxShadow: stationHighlight ? '0 2px 8px rgba(11,110,138,0.22)' : 'none',
            }}
          >
            {stationHighlight ? '🗺️ 1. Google Maps ไปตู้กดน้ำ' : '🗺️ แผนที่ตู้กดน้ำ (รับน้ำแล้ว ✓)'}
          </a>
        )}

        <a
          href={customerMaps.url}
          target="_blank"
          rel="noreferrer"
          style={{
            flex: '1 1 140px',
            minHeight: 44,
            borderRadius: 10,
            background: customerHighlight ? '#058C3B' : '#FFFFFF',
            color: customerHighlight ? '#FFFFFF' : '#475569',
            border: customerHighlight ? 'none' : '1px dashed #CBD5E1',
            fontSize: 12,
            fontWeight: customerHighlight ? 700 : 600,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '4px 10px',
            boxShadow: customerHighlight ? '0 2px 8px rgba(5,140,59,0.24)' : 'none',
          }}
        >
          {customerHighlight ? '🗺️ 2. Google Maps ไปบ้านลูกค้า' : '🗺️ แผนที่บ้านลูกค้า (รอรับน้ำก่อน)'}
        </a>
      </div>

      {customerMaps.mode === 'address_query' && (
        <div
          style={{
            fontSize: 11,
            color: '#92400E',
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
            borderRadius: 8,
            padding: '5px 8px',
          }}
        >
          📍 ลูกค้าไม่ได้ปักหมุด GPS — ระบบตั้งลิงก์ Google Maps ให้ค้นหาตามข้อความที่อยู่บ้านลูกค้าอัตโนมัติ
        </div>
      )}
    </div>
  );
};
