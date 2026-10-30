import React from 'react';
import { ManagedRider } from '../api/admin-api';
import { IconEdit } from './icons/ActionIcons';
import { IconPhone, IconTruck } from './icons/Icons';
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
      <div className="dg-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', color: '#475569', textAlign: 'left', borderBottom: '1px solid #E2E8F0', fontSize: 12 }}>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>ชื่อไรเดอร์</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>LINE User ID</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>เบอร์โทรศัพท์</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>พาหนะ / ทะเบียน</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>โซนวิ่งงาน</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>สถานะ</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {riders.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', background: editingId === r.id ? '#EFF6FF' : '#FFFFFF' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                <td className="dg-num" style={{ padding: '10px 12px', color: '#64748B', fontSize: 12 }}>{r.lineUserId}</td>
                <td className="dg-num" style={{ padding: '10px 12px', color: '#334155' }}>{r.phone || '-'}</td>
                <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 500 }}>{r.vehicle || '-'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 6, background: '#F1F5F9', color: '#334155', fontSize: 12, fontWeight: 600 }}>
                    {r.zone || '-'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <button type="button" onClick={() => onToggleActive(r)} disabled={busy} style={{ padding: '3px 10px', borderRadius: 99, border: 'none', background: r.active ? '#ECFDF5' : '#FEF2F2', color: r.active ? '#047857' : '#B91C1C', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    {r.active ? 'พร้อมรับงาน' : 'ระงับชั่วคราว'}
                  </button>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button type="button" onClick={() => onOpenEdit(r)} className="dg-btn-icon" style={{ minHeight: 30, padding: '0 10px', borderRadius: 7, border: '1px solid #CBD5E1', background: editingId === r.id ? '#0F172A' : '#FFFFFF', color: editingId === r.id ? '#FFFFFF' : '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <IconEdit size={12} />
                    <span>แก้ไข</span>
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
        <div key={r.id} className="dg-card" style={{ border: editingId === r.id ? '1.5px solid #1D4ED8' : '1px solid #E2E8F0', padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{r.name}</div>
              <div className="dg-num" style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>LINE: {r.lineUserId}</div>
            </div>
            <span style={{ padding: '2px 8px', borderRadius: 6, background: '#F1F5F9', color: '#334155', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
              โซน {r.zone || '-'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#334155', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 10px', borderRadius: 8 }}>
            <span className="dg-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconPhone size={12} />{r.phone || '-'}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconTruck size={12} /><strong>{r.vehicle || '-'}</strong></span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
            <button type="button" onClick={() => onOpenEdit(r)} className="dg-btn-icon" style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: editingId === r.id ? '#0F172A' : '#FFFFFF', color: editingId === r.id ? '#FFFFFF' : '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <IconEdit size={13} />
              <span>{editingId === r.id ? 'ปิดแก้ไข' : 'แก้ไข'}</span>
            </button>
            <button type="button" onClick={() => onToggleActive(r)} disabled={busy} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: 'none', background: r.active ? '#ECFDF5' : '#FEF2F2', color: r.active ? '#047857' : '#B91C1C', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {r.active ? 'พร้อมรับงาน' : 'ระงับชั่วคราว'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
