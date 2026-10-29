import React from 'react';
import { ActiveIdentity, AppRoleTab } from '../domain/session-gate';

interface Props {
  identity: ActiveIdentity;
  activeTab: AppRoleTab;
  showTraining: boolean;
  onSelectTab: (tab: AppRoleTab) => void;
  onToggleTraining: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const ROLE_LABELS: Record<ActiveIdentity['role'], { text: string; bg: string }> = {
  admin: { text: 'ADMIN', bg: '#7C3AED' },
  warehouse: { text: 'WAREHOUSE', bg: '#0B6E8A' },
  rider: { text: 'RIDER', bg: '#D97706' },
  customer: { text: 'CUSTOMER', bg: '#1E7B45' },
};

export const TopAuthBar: React.FC<Props> = ({
  identity,
  activeTab,
  showTraining,
  onSelectTab,
  onToggleTraining,
  onOpenLogin,
  onLogout,
  onOpenSettings,
}) => {
  const badge = ROLE_LABELS[identity.role];
  const isStaffManager = identity.role === 'admin' || identity.role === 'warehouse';

  return (
    <div style={{ background: '#091522', color: '#FFFFFF', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, minWidth: 0 }}>
          <span>👤 ผู้ใช้:</span>
          <b style={{ color: '#A8E6C1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
            {identity.displayName}
          </b>
          {identity.username && <span style={{ color: '#94A3B8', fontSize: 11 }}>({identity.username})</span>}
          <span style={{ background: badge.bg, color: '#FFFFFF', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6 }}>
            {badge.text}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onToggleTraining}
            style={{ minHeight: 30, padding: '0 8px', border: 'none', borderRadius: 7, background: showTraining ? '#1E7B45' : '#1C3550', color: '#FFFFFF', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            🎓 คู่มือ
          </button>
          <button
            type="button"
            onClick={onOpenLogin}
            style={{ minHeight: 30, padding: '0 10px', border: '1px solid #3B82F6', borderRadius: 7, background: '#1A56B0', color: '#FFFFFF', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            🔑 Login / สลับผู้ใช้
          </button>
          <button
            type="button"
            onClick={onLogout}
            style={{ minHeight: 30, padding: '0 10px', border: 'none', borderRadius: 7, background: '#C2255C', color: '#FFFFFF', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            🚪 Logout
          </button>
          {(isStaffManager || identity.role === 'rider') && (
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="ตั้งค่า"
              style={{ minHeight: 30, padding: '0 8px', border: 'none', borderRadius: 7, background: '#1C3550', color: '#FFFFFF', fontSize: 12, cursor: 'pointer' }}
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {isStaffManager && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {([
            { id: 'customer', label: '1. มุมมองลูกค้า' },
            { id: 'rider', label: '2. มุมมองไรเดอร์' },
            { id: 'admin', label: '⚙️ หลังบ้าน (Admin)' },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTab(t.id)}
              style={{
                minHeight: 34,
                border: 'none',
                borderRadius: 7,
                background: activeTab === t.id && !showTraining ? '#0B6E8A' : '#1C3550',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
