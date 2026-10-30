import React from 'react';
import { ManagedUser } from '../api/admin-api';
import { IconEdit, IconTrash } from './icons/ActionIcons';
import { IconKey, IconPhone } from './icons/Icons';
import { AdminViewMode } from './ViewModeToggle';

interface Props {
  users: ManagedUser[];
  viewMode: AdminViewMode;
  editId: string | null;
  busy: boolean;
  onOpenEdit: (u: ManagedUser) => void;
  onDelete: (u: ManagedUser) => void;
}

export const AdminUsersView: React.FC<Props> = ({
  users,
  viewMode,
  editId,
  busy,
  onOpenEdit,
  onDelete,
}) => {
  if (viewMode === 'grid') {
    return (
      <div className="dg-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', color: '#475569', textAlign: 'left', borderBottom: '1px solid #E2E8F0', fontSize: 12 }}>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>ชื่อ-นามสกุล</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>บทบาท</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>Username / Auth</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>เบอร์โทร</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>LINE ID</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>สถานะ</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9', background: editId === u.id ? '#EFF6FF' : '#FFFFFF', opacity: u.active ? 1 : 0.65 }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>{u.name}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 6, background: '#F1F5F9', color: '#334155', fontSize: 11, fontWeight: 600 }}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: '#334155' }}>
                  <strong>{u.username || '-'}</strong>{' '}
                  <span style={{ fontSize: 11, color: '#64748B' }}>({u.hasPassword ? 'Password' : 'LINE Only'})</span>
                </td>
                <td className="dg-num" style={{ padding: '10px 12px', color: '#334155' }}>{u.phone || '-'}</td>
                <td className="dg-num" style={{ padding: '10px 12px', fontSize: 12, color: '#64748B' }}>{u.lineUserId}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 99, background: u.active ? '#ECFDF5' : '#FEF2F2', color: u.active ? '#047857' : '#B91C1C', fontSize: 11, fontWeight: 600 }}>
                    {u.active ? 'Active' : 'ระงับ'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button type="button" onClick={() => onOpenEdit(u)} className="dg-btn-icon" style={{ minHeight: 30, padding: '0 10px', borderRadius: 7, border: '1px solid #CBD5E1', background: editId === u.id ? '#0F172A' : '#FFFFFF', color: editId === u.id ? '#FFFFFF' : '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <IconEdit size={12} />
                      <span>แก้ไข</span>
                    </button>
                    <button type="button" onClick={() => onDelete(u)} disabled={busy} className="dg-btn-icon" style={{ minHeight: 30, padding: '0 10px', borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <IconTrash size={12} />
                      <span>ลบ</span>
                    </button>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
      {users.map((u) => (
        <div
          key={u.id}
          className="dg-card"
          style={{
            border: editId === u.id ? '1.5px solid #1D4ED8' : '1px solid #E2E8F0',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 10,
            opacity: u.active ? 1 : 0.65,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{u.name}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B', marginTop: 2 }}>
                <IconPhone size={12} />
                <span className="dg-num">{u.phone || '-'} · {u.lineUserId}</span>
              </div>
            </div>
            <span style={{ padding: '2px 8px', borderRadius: 6, background: '#F1F5F9', color: '#334155', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
              {u.role.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12, color: '#334155', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 10px', borderRadius: 8 }}>
            <IconKey size={12} style={{ color: '#64748B' }} />
            <span>Username: <strong>{u.username || '-'}</strong> · {u.hasPassword ? 'มีรหัสผ่าน' : 'เฉพาะ LINE'}</span>
            <span style={{ marginInlineStart: 'auto', fontWeight: 600, color: u.active ? '#047857' : '#B91C1C' }}>
              {u.active ? 'Active' : 'ระงับบัญชี'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
            <button type="button" onClick={() => onOpenEdit(u)} className="dg-btn-icon" style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: editId === u.id ? '#0F172A' : '#FFFFFF', color: editId === u.id ? '#FFFFFF' : '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <IconEdit size={13} />
              <span>{editId === u.id ? 'กำลังแก้ไข...' : 'แก้ไข / ตั้งรหัสผ่าน'}</span>
            </button>
            <button type="button" onClick={() => onDelete(u)} disabled={busy} className="dg-btn-icon" style={{ minHeight: 34, padding: '0 12px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <IconTrash size={13} />
              <span>ลบ</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
