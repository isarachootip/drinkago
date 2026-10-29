import React from 'react';
import { MeetupEvent } from '../api/events-api';
import { classifyEventWindow, EventWindowCategory, getBangkokTodayIso } from '../domain/thai-datetime';
import { AdminViewMode } from './ViewModeToggle';

interface Props {
  events: MeetupEvent[];
  viewMode: AdminViewMode;
  onOpenEdit: (ev: MeetupEvent) => void;
  onToggleActive: (ev: MeetupEvent) => void;
  onDelete: (ev: MeetupEvent) => void;
}

const WINDOW_BADGE: Record<EventWindowCategory, { label: string; bg: string; color: string }> = {
  within_30d: { label: '🟢 แสดงใน LINE (ใน 30 วัน)', bg: '#DCFCE7', color: '#15803D' },
  future_beyond_30d: { label: '🔵 ล่วงหน้า (> 30 วัน)', bg: '#DBEAFE', color: '#1D4ED8' },
  past: { label: '⚪ ผ่านไปแล้ว', bg: '#F1F5F9', color: '#64748B' },
};

export const AdminEventsView: React.FC<Props> = ({
  events,
  viewMode,
  onOpenEdit,
  onToggleActive,
  onDelete,
}) => {
  if (events.length === 0) {
    return (
      <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 20, textAlign: 'center', color: '#64748B', border: '1px solid #DCE4EC' }}>
        ยังไม่มีรายการตารางกิจกรรมพบปะ
      </div>
    );
  }

  const todayIso = getBangkokTodayIso();
  const renderWindowBadge = (ev: MeetupEvent) => {
    const b = WINDOW_BADGE[classifyEventWindow(ev.eventDate, todayIso)];
    return (
      <span style={{ background: b.bg, color: b.color, padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {b.label}
      </span>
    );
  };

  if (viewMode === 'grid') {
    return (
      <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #DCE4EC', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #DCE4EC', textAlign: 'left', color: '#33475B' }}>
              <th style={{ padding: '10px 12px' }}>วันที่</th>
              <th style={{ padding: '10px 12px' }}>ช่วงแสดงผล LINE</th>
              <th style={{ padding: '10px 12px' }}>เวลา</th>
              <th style={{ padding: '10px 12px' }}>หัวข้อ / สถานที่</th>
              <th style={{ padding: '10px 12px' }}>เบอร์โทร</th>
              <th style={{ padding: '10px 12px' }}>แผนที่</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} style={{ borderBottom: '1px solid #F1F5F9', opacity: ev.active ? 1 : 0.6 }}>
                <td style={{ padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>📅 {ev.eventDate}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{renderWindowBadge(ev)}</td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#7C3AED', whiteSpace: 'nowrap' }}>⏰ {ev.eventTime} น.</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, color: '#0F2236' }}>{ev.title}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>📍 {ev.locationName}</div>
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>📞 {ev.contactPhone}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  <a href={ev.mapUrl} target="_blank" rel="noreferrer" style={{ color: '#1A56B0', fontWeight: 600 }}>🗺️ เปิดแผนที่</a>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button type="button" onClick={() => onOpenEdit(ev)} style={{ padding: '5px 9px', borderRadius: 8, border: '1px solid #7C3AED', background: '#F3E8FF', color: '#6B21A8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✏️ แก้ไข</button>
                    <button type="button" onClick={() => onToggleActive(ev)} style={{ padding: '5px 9px', borderRadius: 8, border: 'none', background: ev.active ? '#1E7B45' : '#64748B', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{ev.active ? '✅ แสดงผล' : '⏸️ ซ่อน'}</button>
                    <button type="button" onClick={() => onDelete(ev)} style={{ padding: '5px 9px', borderRadius: 8, border: 'none', background: '#FEE2E2', color: '#B91C1C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🗑️ ลบ</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {events.map((ev) => (
        <div key={ev.id} style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #DCE4EC', padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, opacity: ev.active ? 1 : 0.6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {renderWindowBadge(ev)}
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F2236' }}>📅 {ev.eventDate} เวลา {ev.eventTime} น. — {ev.title}</span>
            </div>
            <div style={{ fontSize: 13, color: '#33475B' }}>📍 สถานที่: <b>{ev.locationName}</b> · 📞 โทร: <b>{ev.contactPhone}</b></div>
            <a href={ev.mapUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1A56B0', fontWeight: 600 }}>🗺️ เปิดแผนที่ Google Maps</a>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => onOpenEdit(ev)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #7C3AED', background: '#F3E8FF', color: '#6B21A8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✏️ แก้ไข</button>
            <button type="button" onClick={() => onToggleActive(ev)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: ev.active ? '#1E7B45' : '#64748B', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{ev.active ? '✅ แสดงผล' : '⏸️ ซ่อน'}</button>
            <button type="button" onClick={() => onDelete(ev)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#FEE2E2', color: '#B91C1C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🗑️ ลบ</button>
          </div>
        </div>
      ))}
    </div>
  );
};
