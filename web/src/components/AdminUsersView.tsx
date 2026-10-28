import React from 'react';
import { ManagedUser } from '../api/admin-api';
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
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
          <thead>
            <tr style={{ background: '#F1F5F9', color: '#0F2236', textAlign: 'left', borderBottom: '1px solid #DCE4EC' }}>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>ชื่อ-นามสกุล</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>บทบาท</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>Username / รหัสผ่าน</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>เบอร์โทร</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>LINE ID</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>สถานะ</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                style={{
                  borderBottom: '1px solid #EEF2F6',
                  background: editId === u.id ? '#F0F9FF' : '#FFFFFF',
                  opacity: u.active ? 1 : 0.65,
                }}
              >
                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F2236' }}>{u.name}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 6, background: '#E6EEF9', color: '#123F85', fontSize: 11, fontWeight: 700 }}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: '#33475B' }}>
                  <b>{u.username || '-'}</b>{' '}
                  <span style={{ fontSize: 11, color: '#64748B' }}>({u.hasPassword ? '🔑 มีรหัสผ่าน' : 'เฉพาะ LINE'})</span>
                </td>
                <td style={{ padding: '10px 12px', color: '#33475B' }}>{u.phone || '-'}</td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748B' }}>{u.lineUserId}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 6, background: u.active ? '#E7F5EC' : '#FCE8EF', color: u.active ? '#1E7B45' : '#C2255C', fontSize: 11, fontWeight: 700 }}>
                    {u.active ? '● Active' : '○ ระงับ'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => onOpenEdit(u)}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #DCE4EC', background: editId === u.id ? '#0B6E8A' : '#F3F7FA', color: editId === u.id ? '#FFFFFF' : '#0F2236', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      ✏️ แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(u)}
                      disabled={busy}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #C2255C', background: '#FFF5F8', color: '#C2255C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      🗑️ ลบ
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
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: editId === u.id ? '2px solid #0B6E8A' : '1px solid #DCE4EC',
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
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2236' }}>{u.name}</div>
              <div style={{ fontSize: 12, color: '#4A5B6E', marginTop: 2 }}>
                📞 {u.phone || '-'} · LINE: {u.lineUserId}
              </div>
            </div>
            <span style={{ padding: '3px 8px', borderRadius: 6, background: '#E6EEF9', color: '#123F85', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {u.role.toUpperCase()}
            </span>
          </div>

          <div style={{ fontSize: 12, color: '#33475B', background: '#F8FAFC', padding: '6px 10px', borderRadius: 8 }}>
            Username: <b>{u.username || '-'}</b> · {u.hasPassword ? '🔑 มีรหัสผ่าน' : '📱 เฉพาะ LINE'} ·{' '}
            <b style={{ color: u.active ? '#1E7B45' : '#C2255C' }}>{u.active ? '● Active' : '○ ระงับบัญชี'}</b>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, paddingTop: 6, borderTop: '1px solid #EEF2F6' }}>
            <button
              type="button"
              onClick={() => onOpenEdit(u)}
              style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #DCE4EC', background: editId === u.id ? '#0B6E8A' : '#F3F7FA', color: editId === u.id ? '#FFFFFF' : '#0F2236', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              ✏️ {editId === u.id ? 'กำลังแก้ไข...' : 'แก้ไข / ตั้งรหัสผ่าน'}
            </button>
            <button
              type="button"
              onClick={() => onDelete(u)}
              disabled={busy}
              style={{ minHeight: 34, padding: '0 12px', borderRadius: 8, border: '1px solid #C2255C', background: '#FFF5F8', color: '#C2255C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              🗑️ ลบ
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
