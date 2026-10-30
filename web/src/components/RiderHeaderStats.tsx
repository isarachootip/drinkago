import React from 'react';
import { formatBaht } from '../api/schemas';
import { useI18n } from '../i18n/I18nContext';
import { IconSettings } from './icons/Icons';

interface Props {
  devUser: string;
  jobCount: number;
  totalBagsToCollect: number;
  totalCashToCollect: number;
  onOpenSettings: () => void;
}

export const RiderHeaderStats: React.FC<Props> = ({
  devUser,
  jobCount,
  totalBagsToCollect,
  totalCashToCollect,
  onOpenSettings,
}) => {
  const { t } = useI18n();

  return (
    <div
      style={{
        background: '#0F172A',
        color: '#FFFFFF',
        padding: '18px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        borderBottom: '1px solid #1E293B',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{t('riderTodayJobs')}</span>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>
            {t('riderUserPrefix')}: {devUser}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#34D399',
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(52, 211, 153, 0.28)',
              padding: '4px 10px',
              borderRadius: 99,
            }}
          >
            {t('riderReadyBadge')}
          </span>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={t('riderSettingsBtn')}
            className="dg-btn-icon"
            style={{
              minHeight: 34,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#1E293B',
              color: '#E2E8F0',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <IconSettings size={14} />
            <span>{t('riderSettingsBtn')}</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{t('riderStatPending')}</span>
          <span className="dg-num" style={{ fontSize: 18, fontWeight: 700 }}>
            {jobCount} <span style={{ fontSize: 13, fontWeight: 500, color: '#CBD5E1' }}>{t('riderStatJobUnit')}</span>
          </span>
        </div>
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{t('riderStatBags')}</span>
          <span className="dg-num" style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC' }}>
            {totalBagsToCollect} <span style={{ fontSize: 13, fontWeight: 500, color: '#CBD5E1' }}>{t('riderStatBagUnit')}</span>
          </span>
        </div>
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{t('riderStatCash')}</span>
          <span className="dg-num" style={{ fontSize: 18, fontWeight: 700 }}>{formatBaht(totalCashToCollect)}</span>
        </div>
      </div>
    </div>
  );
};
