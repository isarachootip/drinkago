import React from 'react';
import { ActiveIdentity, AppRoleTab } from '../domain/session-gate';
import { useI18n } from '../i18n/I18nContext';
import { IconBook, IconKey, IconLogout, IconSettings, IconUser } from './icons/Icons';
import { LanguageSwitcher } from './LanguageSwitcher';

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

const ROLE_BADGES: Record<ActiveIdentity['role'], { text: string; color: string; bg: string; border: string }> = {
  admin: { text: 'ADMIN', color: '#E9D5FF', bg: 'rgba(139, 92, 246, 0.16)', border: 'rgba(167, 139, 250, 0.35)' },
  warehouse: { text: 'WAREHOUSE', color: '#BAE6FD', bg: 'rgba(14, 165, 233, 0.16)', border: 'rgba(125, 211, 252, 0.35)' },
  rider: { text: 'RIDER', color: '#FDE68A', bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(252, 211, 77, 0.35)' },
  customer: { text: 'CUSTOMER', color: '#A7F3D0', bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(110, 231, 183, 0.35)' },
};

const ghostBtn: React.CSSProperties = {
  height: 30,
  padding: '0 10px',
  borderRadius: 7,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.05)',
  color: '#F1F5F9',
  fontSize: 11.5,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  whiteSpace: 'nowrap',
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
  const { t } = useI18n();
  const badge = ROLE_BADGES[identity.role];
  const isStaffManager = identity.role === 'admin' || identity.role === 'warehouse';

  return (
    <header
      style={{
        background: '#0F172A',
        color: '#F8FAFC',
        padding: '10px 14px',
        borderBottom: '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, minWidth: 0 }}>
          <IconUser size={14} style={{ color: '#94A3B8' }} />
          <span style={{ color: '#94A3B8' }}>{t('topUserLabel')}:</span>
          <span style={{ fontWeight: 600, color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
            {identity.displayName}
          </span>
          {identity.username && <span style={{ color: '#64748B', fontSize: 11.5 }}>({identity.username})</span>}
          <span
            style={{
              background: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.border}`,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.04em',
              padding: '1px 7px',
              borderRadius: 99,
            }}
          >
            {badge.text}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <LanguageSwitcher variant="dark" compact />
          <button
            type="button"
            onClick={onToggleTraining}
            style={{
              ...ghostBtn,
              background: showTraining ? 'rgba(16, 185, 129, 0.22)' : ghostBtn.background,
              borderColor: showTraining ? 'rgba(52, 211, 153, 0.45)' : 'rgba(255,255,255,0.14)',
            }}
          >
            <IconBook size={13} />
            <span>{t('topGuide')}</span>
          </button>
          <button
            type="button"
            onClick={onOpenLogin}
            style={{ ...ghostBtn, background: 'rgba(37, 99, 235, 0.22)', borderColor: 'rgba(96, 165, 250, 0.4)' }}
          >
            <IconKey size={13} />
            <span>{t('topLoginSwitch')}</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            style={{ ...ghostBtn, color: '#FCA5A5', borderColor: 'rgba(248, 113, 113, 0.28)' }}
          >
            <IconLogout size={13} />
            <span>{t('topLogout')}</span>
          </button>
          {(isStaffManager || identity.role === 'rider') && (
            <button type="button" onClick={onOpenSettings} aria-label={t('topSettings')} style={{ ...ghostBtn, padding: '0 8px' }}>
              <IconSettings size={14} />
            </button>
          )}
        </div>
      </div>

      {isStaffManager && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, background: '#1E293B', padding: 3, borderRadius: 9 }}>
          {([
            { id: 'customer', label: t('tabCustomerView') },
            { id: 'rider', label: t('tabRiderView') },
            { id: 'admin', label: t('tabAdminView') },
          ] as const).map((tab) => {
            const selected = activeTab === tab.id && !showTraining;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                style={{
                  minHeight: 32,
                  border: 'none',
                  borderRadius: 7,
                  background: selected ? '#2563EB' : 'transparent',
                  color: selected ? '#FFFFFF' : '#CBD5E1',
                  fontSize: 12,
                  fontWeight: selected ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
