import React from 'react';
import { ManagedRider } from '../api/admin-api';
import { AdminViewMode } from './ViewModeToggle';

interface Props {
  riders: ManagedRider[];
  viewMode: AdminViewMode;
  editingId: string | null;
  busy: boolean;
  onOpenEdit: (r: ManagedRider) => void;
  onToggleActive: (r: ManagedRider) => void;
}

export const AdminRidersView: React.FC<Props> = ({
  riders,
  viewMode,
  editingId,
  busy,
  onOpenEdit,
  onToggleActive,
}) => {
  if (viewMode === 'grid') {
    return (
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
          <thead>
            <tr style={{ background: '#F1F5F9', color: '#0F2236', textAlign: 'left', borderBottom: '1px solid #DCE4EC' }}>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>ชื่อไรเดอร์</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>LINE User ID</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>เบอร์โทรศัพท์</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>พาหนะ / ทะเบียน</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>โซนวิ่งงาน</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>สถานะ</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {riders.map((r) => (
              <tr
                key={r.id}
                style={{
                  borderBottom: '1px solid #EEF2F6',
                  background: editingId === r.id ? '#F0F9FF' : '#FFFFFF',
                }}
              >
                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F2236' }}>{r.name}</td>
                <td style={{ padding: '10px 12px', color: '#64748B', fontSize: 12 }}>{r.lineUserId}</td>
                <td style={{ padding: '10px 12px', color: '#33475B' }}>{r.phone || '-'}</td>
                <td style={{ padding: '10px 12px', color: '#33475B', fontWeight: 600 }}>🛵 {r.vehicle || '-'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 6, background: '#E6EEF9', color: '#1A56B0', fontSize: 12, fontWeight: 700 }}>
                    {r.zone || '-'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    onClick={() => onToggleActive(r)}
                    disabled={busy}
                    style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: r.active ? '#E7F5EC' : '#FCE8EF', color: r.active ? '#1E7B45' : '#C2255C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {r.active ? '● พร้อมรับงาน' : '○ ระงับชั่วคราว'}
                  </button>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    onClick={() => onOpenEdit(r)}
                    style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #DCE4EC', background: editingId === r.id ? '#0B6E8A' : '#F3F7FA', color: editingId === r.id ? '#FFFFFF' : '#0F2236', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✏️ แก้ไข
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 12 }}>
      {riders.map((r) => (
        <div
          key={r.id}
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: editingId === r.id ? '2px solid #0B6E8A' : '1px solid #DCE4EC',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 10,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2236' }}>{r.name}</div>
              <div style={{ fontSize: 12, color: '#4A5B6E', marginTop: 2 }}>LINE: {r.lineUserId}</div>
            </div>
            <span style={{ padding: '3px 8px', borderRadius: 8, background: '#E6EEF9', color: '#1A56B0', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              โซน {r.zone || '-'}
            </span>
          </div>

          <div style={{ fontSize: 12, color: '#33475B', background: '#F8FAFC', padding: '6px 10px', borderRadius: 8 }}>
            📞 {r.phone || '-'} · 🛵 พาหนะ: <b>{r.vehicle || '-'}</b>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingTop: 6, borderTop: '1px solid #EEF2F6' }}>
            <button
              type="button"
              onClick={() => onOpenEdit(r)}
              style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #DCE4EC', background: editingId === r.id ? '#0B6E8A' : '#F3F7FA', color: editingId === r.id ? '#FFFFFF' : '#0F2236', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              ✏️ {editingId === r.id ? 'ปิดแก้ไข' : 'แก้ไข'}
            </button>
            <button
              type="button"
              onClick={() => onToggleActive(r)}
              disabled={busy}
              style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: 'none', background: r.active ? '#E7F5EC' : '#FCE8EF', color: r.active ? '#1E7B45' : '#C2255C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              {r.active ? '● พร้อมรับงาน' : '○ ระงับชั่วคราว'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
