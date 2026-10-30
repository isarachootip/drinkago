import React from 'react';
import { MeetupEvent } from '../api/events-api';
import { classifyEventWindow, EventWindowCategory, getBangkokTodayIso } from '../domain/thai-datetime';
import { IconEdit, IconTrash } from './icons/ActionIcons';
import { IconCalendar, IconClock, IconMapPin, IconNavigation, IconPhone } from './icons/Icons';
import { AdminViewMode } from './ViewModeToggle';

interface Props {
  events: MeetupEvent[];
  viewMode: AdminViewMode;
  onOpenEdit: (ev: MeetupEvent) => void;
  onToggleActive: (ev: MeetupEvent) => void;
  onDelete: (ev: MeetupEvent) => void;
}

const WINDOW_BADGE: Record<EventWindowCategory, { label: string; bg: string; color: string }> = {
  within_30d: { label: 'แสดงใน LINE (ใน 30 วัน)', bg: '#ECFDF5', color: '#047857' },
  future_beyond_30d: { label: 'ล่วงหน้า (> 30 วัน)', bg: '#EFF6FF', color: '#1D4ED8' },
  past: { label: 'ผ่านไปแล้ว', bg: '#F1F5F9', color: '#64748B' },
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
      <div className="dg-card" style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
        ยังไม่มีรายการตารางกิจกรรมพบปะ
      </div>
    );
  }

  const todayIso = getBangkokTodayIso();
  const renderWindowBadge = (ev: MeetupEvent) => {
    const b = WINDOW_BADGE[classifyEventWindow(ev.eventDate, todayIso)];
    return (
      <span style={{ background: b.bg, color: b.color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {b.label}
      </span>
    );
  };

  if (viewMode === 'grid') {
    return (
      <div className="dg-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569', fontSize: 12 }}>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>วันที่</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>ช่วงแสดงผล LINE</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>เวลา</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>หัวข้อ / สถานที่</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>เบอร์โทร</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>แผนที่</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} style={{ borderBottom: '1px solid #F1F5F9', opacity: ev.active ? 1 : 0.6 }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>{ev.eventDate}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{renderWindowBadge(ev)}</td>
                <td className="dg-num" style={{ padding: '10px 12px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>{ev.eventTime} น.</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{ev.title}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{ev.locationName}</div>
                </td>
                <td className="dg-num" style={{ padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{ev.contactPhone}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  <a href={ev.mapUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1D4ED8', fontWeight: 600, textDecoration: 'none' }}>
                    <IconNavigation size={12} />
                    <span>แผนที่</span>
                  </a>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button type="button" onClick={() => onOpenEdit(ev)} className="dg-btn-icon" style={{ minHeight: 28, padding: '0 8px', borderRadius: 7, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><IconEdit size={12} /><span>แก้ไข</span></button>
                    <button type="button" onClick={() => onToggleActive(ev)} style={{ minHeight: 28, padding: '0 8px', borderRadius: 7, border: 'none', background: ev.active ? '#ECFDF5' : '#F1F5F9', color: ev.active ? '#047857' : '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{ev.active ? 'แสดงผล' : 'ซ่อน'}</button>
                    <button type="button" onClick={() => onDelete(ev)} className="dg-btn-icon" style={{ minHeight: 28, padding: '0 8px', borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><IconTrash size={12} /><span>ลบ</span></button>
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
        <div key={ev.id} className="dg-card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, opacity: ev.active ? 1 : 0.6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {renderWindowBadge(ev)}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                <IconCalendar size={14} style={{ color: '#64748B' }} />
                <span>{ev.eventDate}</span>
                <IconClock size={14} style={{ color: '#64748B' }} />
                <span className="dg-num">{ev.eventTime}</span>
                <span>— {ev.title}</span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#475569' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconMapPin size={12} /><strong>{ev.locationName}</strong></span>
              <span className="dg-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconPhone size={12} /><strong>{ev.contactPhone}</strong></span>
              <a href={ev.mapUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1D4ED8', fontWeight: 600, textDecoration: 'none' }}><IconNavigation size={12} /><span>Google Maps</span></a>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => onOpenEdit(ev)} className="dg-btn-icon" style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><IconEdit size={12} /><span>แก้ไข</span></button>
            <button type="button" onClick={() => onToggleActive(ev)} style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, border: 'none', background: ev.active ? '#ECFDF5' : '#F1F5F9', color: ev.active ? '#047857' : '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{ev.active ? 'แสดงผล' : 'ซ่อน'}</button>
            <button type="button" onClick={() => onDelete(ev)} className="dg-btn-icon" style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><IconTrash size={12} /><span>ลบ</span></button>
          </div>
        </div>
      ))}
    </div>
  );
};
