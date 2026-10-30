import React, { useState } from 'react';
import { adminMgmtApi } from '../api/admin-api';
import { StaffSession } from '../api/role-api';
import { startLineLogin } from '../domain/liff-auth';
import { useI18n } from '../i18n/I18nContext';
import { IconArrowLeft } from './icons/ActionIcons';
import { IconKey, IconLineChat } from './icons/Icons';
import { LanguageSwitcher } from './LanguageSwitcher';

interface Props {
  targetRole?: 'rider' | 'admin' | 'warehouse' | 'staff' | 'any';
  onLoginSuccess: (session: StaffSession) => void;
  onCancel?: () => void;
  onNotify: (msg: string) => void;
}

export const StaffLoginCard: React.FC<Props> = ({ targetRole = 'any', onLoginSuccess, onCancel, onNotify }) => {
  const { t } = useI18n();
  const [username, setUsername] = useState(targetRole === 'admin' ? 'admin' : '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return onNotify('กรุณากรอก Username และ Password');
    setBusy(true);
    try {
      const session = await adminMgmtApi.login(username.trim(), password);
      if (targetRole === 'admin' && session.user.role !== 'admin' && session.user.role !== 'warehouse') {
        onNotify('บัญชีนี้ไม่ใช่สิทธิ์ผู้ดูแลหลังบ้าน (Admin / Warehouse)');
        return;
      }
      onLoginSuccess(session);
      onNotify(`เข้าสู่ระบบสำเร็จ: ${session.user.name} (${session.user.role.toUpperCase()})`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 410,
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          padding: '26px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#EFF6FF',
              color: '#1D4ED8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #DBEAFE',
            }}
          >
            <IconKey size={18} />
          </div>
          <LanguageSwitcher variant="light" compact />
        </div>

        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: '#0F172A' }}>{t('loginHeading')}</div>
          <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4, lineHeight: 1.5 }}>{t('loginSubtitle')}</div>
        </div>

        <button
          type="button"
          onClick={() => void startLineLogin('shop', onNotify)}
          className="dg-btn-icon"
          style={{
            minHeight: 46,
            borderRadius: 10,
            border: 'none',
            background: '#06C755',
            color: '#FFFFFF',
            fontSize: 14.5,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(6, 199, 85, 0.2)',
          }}
        >
          <IconLineChat size={17} />
          <span>{t('loginWithLineCustomer')}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94A3B8', fontSize: 11.5 }}>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          <span>{t('loginOrStaffDivider')}</span>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12.5, fontWeight: 500, color: '#334155' }}>{t('loginUsernameLabel')}</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('loginUsernamePlaceholder')}
            autoComplete="username"
            style={{ minHeight: 42, padding: '0 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 14 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 12.5, fontWeight: 500, color: '#334155' }}>{t('loginPasswordLabel')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('loginPasswordPlaceholder')}
            autoComplete="current-password"
            style={{ minHeight: 42, padding: '0 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 14 }}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          style={{
            minHeight: 44,
            borderRadius: 10,
            border: 'none',
            background: '#0F172A',
            color: '#FFFFFF',
            fontSize: 14.5,
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: 2,
          }}
        >
          {busy ? t('loginChecking') : t('loginSubmit')}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="dg-btn-icon"
            style={{
              minHeight: 38,
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#475569',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <IconArrowLeft size={15} />
            <span>{t('loginCancelBack')}</span>
          </button>
        )}
      </form>
    </div>
  );
};
