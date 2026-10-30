import React, { useState } from 'react';
import { startLineLogin } from '../domain/liff-auth';
import { useI18n } from '../i18n/I18nContext';
import { IconShield } from './icons/ActionIcons';
import { IconDroplet, IconLineChat } from './icons/Icons';
import { LanguageSwitcher } from './LanguageSwitcher';

interface Props {
  onOpenStaffLogin: () => void;
  onUnlockDemo: () => void;
  onNotify?: (msg: string) => void;
}

export const ProductionEntryGate: React.FC<Props> = ({ onOpenStaffLogin, onUnlockDemo, onNotify }) => {
  const { t } = useI18n();
  const [busyLine, setBusyLine] = useState(false);

  const handleLineLogin = async () => {
    setBusyLine(true);
    try {
      await startLineLogin('shop', onNotify);
    } finally {
      setBusyLine(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24 }}>
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          padding: '28px 22px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 14,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
          <LanguageSwitcher variant="light" compact />
        </div>

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: '#EFF6FF',
            border: '1px solid #DBEAFE',
            color: '#1D4ED8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconDroplet size={24} />
        </div>

        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#0F172A' }}>{t('gateHeading')}</div>
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.55, marginTop: 6 }}>{t('gateDescription')}</div>
        </div>

        <button
          type="button"
          onClick={handleLineLogin}
          disabled={busyLine}
          className="dg-btn-icon"
          style={{
            width: '100%',
            minHeight: 46,
            borderRadius: 10,
            border: 'none',
            background: '#06C755',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            marginTop: 2,
            boxShadow: '0 2px 8px rgba(6, 199, 85, 0.22)',
          }}
        >
          <IconLineChat size={18} />
          <span>{busyLine ? t('gateLineConnecting') : t('gateLineLoginBtn')}</span>
        </button>

        <a
          href="https://line.me/R/ti/p/@157iywjs"
          target="_blank"
          rel="noreferrer"
          className="dg-btn-icon"
          style={{
            width: '100%',
            minHeight: 42,
            borderRadius: 10,
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            color: '#0F172A',
            fontWeight: 500,
            fontSize: 13.5,
            textDecoration: 'none',
          }}
        >
          <IconLineChat size={16} style={{ color: '#06C755' }} />
          <span>{t('gateOpenLineOa')}</span>
        </a>

        <button
          type="button"
          onClick={onOpenStaffLogin}
          className="dg-btn-icon"
          style={{
            width: '100%',
            minHeight: 42,
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            background: '#F8FAFC',
            color: '#334155',
            fontWeight: 500,
            fontSize: 13.5,
            cursor: 'pointer',
          }}
        >
          <IconShield size={16} style={{ color: '#1D4ED8' }} />
          <span>{t('gateStaffLoginBtn')}</span>
        </button>

        <button
          type="button"
          onClick={onUnlockDemo}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#64748B',
            fontSize: 12,
            textDecoration: 'underline',
            cursor: 'pointer',
            marginTop: 2,
          }}
        >
          {t('gateDemoCustomerBtn')}
        </button>
      </div>
    </div>
  );
};
