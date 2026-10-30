import React from 'react';
import { DevAuthSettings, formatBaht, OrderDetail, RiderJob } from '../api/schemas';
import { IconRefresh } from '../components/icons/ActionIcons';
import { IconBag, IconDroplet, IconHome } from '../components/icons/Icons';
import { RiderHeaderStats } from '../components/RiderHeaderStats';
import { RiderStepTracker } from '../components/RiderStepTracker';
import { formatJobDistanceLabel } from '../domain/navigation';
import { getRiderCurrentStepSummary } from '../domain/rider-steps';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  jobs: RiderJob[];
  selectedJob: RiderJob | null;
  selectedDetail: OrderDetail | null;
  settings: DevAuthSettings;
  loading: boolean;
  onSelectJob: (job: RiderJob) => void;
  onPrimaryAction: (job: RiderJob) => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
}

export const RiderJobsPage: React.FC<Props> = ({
  jobs,
  selectedJob,
  selectedDetail,
  settings,
  loading,
  onSelectJob,
  onPrimaryAction,
  onOpenSettings,
  onRefresh,
}) => {
  const { t } = useI18n();
  const active = selectedJob ?? jobs[0] ?? null;
  const remaining = jobs.filter((j) => j.id !== active?.id);
  const totalBagsToCollect = jobs.reduce((sum, j) => sum + j.expectBagReturn, 0);
  const totalCashToCollect = jobs
    .filter((j) => j.paymentMethod === 'CASH' && j.paymentStatus !== 'PAID')
    .reduce((sum, j) => sum + j.totalSatang, 0);

  const stepSummary = active
    ? getRiderCurrentStepSummary(active.status, Boolean(active.riderId), (k) => t(k))
    : '';
  const distText = active ? formatJobDistanceLabel(settings.mockLat, settings.mockLng, active.address) : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <RiderHeaderStats
        devUser={settings.devUser}
        jobCount={jobs.length}
        totalBagsToCollect={totalBagsToCollect}
        totalCashToCollect={totalCashToCollect}
        onOpenSettings={onOpenSettings}
      />

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!active ? (
          <div className="dg-card" style={{ padding: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
              {loading ? t('riderLoadingJobs') : t('riderEmptyQueueTitle')}
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>{t('riderEmptyQueueDesc')}</div>
            <button
              type="button"
              onClick={onRefresh}
              className="dg-btn-icon"
              style={{ minHeight: 42, padding: '0 18px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              <IconRefresh size={14} />
              <span>{t('riderRefreshJobs')}</span>
            </button>
          </div>
        ) : (
          <div className="dg-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8', background: '#EFF6FF', padding: '3px 10px', borderRadius: 99 }}>
                {stepSummary}
              </span>
              <span className="dg-num" style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                #{active.code} · {distText}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>{active.customerName}</span>
              <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: '#334155' }}>
                <IconHome size={15} style={{ marginTop: 2, color: '#64748B' }} />
                <span>
                  <strong style={{ fontWeight: 600 }}>{t('riderCustomerHome')}:</strong> {active.address.label} · {active.address.detail}
                  {active.address.note ? ` · ${active.address.note}` : ''}
                </span>
              </span>
              {active.station?.name && (
                <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: '#0369A1', fontWeight: 600 }}>
                  <IconDroplet size={15} style={{ marginTop: 2 }} />
                  <span>
                    {t('riderWaterStation')}: {active.station.code} · {active.station.name} ({active.station.addressDetail})
                  </span>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedDetail?.items.map((it) => (
                <span key={it.productId} style={{ fontSize: 12, fontWeight: 500, background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', padding: '3px 10px', borderRadius: 8 }}>
                  {it.name} × {it.qty}
                </span>
              ))}
              {active.expectBagReturn > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, background: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: 8 }}>
                  <IconBag size={13} />
                  <span>{t('riderCollectBagsBadge', { count: active.expectBagReturn })}</span>
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 600, background: '#ECFDF5', color: '#047857', padding: '3px 10px', borderRadius: 8 }}>
                {active.paymentMethod === 'CASH'
                  ? t('riderCollectCashBadge', { amount: formatBaht(active.totalSatang) })
                  : `${active.paymentMethod} (${active.paymentStatus})`}
              </span>
            </div>

            <RiderStepTracker job={active} onPrimaryAction={onPrimaryAction} />
          </div>
        )}

        {remaining.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
              {t('riderRemainingJobs', { count: remaining.length })}
            </div>
            <div className="dg-card" style={{ overflow: 'hidden' }}>
              {remaining.map((job, idx) => (
                <div
                  key={job.id}
                  onClick={() => onSelectJob(job)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: idx < remaining.length - 1 ? '1px solid #E2E8F0' : 'none', cursor: 'pointer' }}
                >
                  <span className="dg-num" style={{ width: 26, height: 26, borderRadius: 13, background: '#F1F5F9', color: '#334155', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {idx + 2}
                  </span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                      {job.customerName} · <span className="dg-num">#{job.code}</span>
                    </span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      {getRiderCurrentStepSummary(job.status, Boolean(job.riderId), (k) => t(k))} · {job.paymentMethod}
                    </span>
                  </div>
                  {job.expectBagReturn > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, background: '#FEF3C7', color: '#92400E', padding: '3px 8px', borderRadius: 6 }}>
                      {t('riderBagShort', { count: job.expectBagReturn })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ background: '#FFFFFF', borderTop: '1px solid #E2E8F0', padding: '12px 16px 20px' }}>
        <button
          type="button"
          onClick={onRefresh}
          className="dg-btn-icon"
          style={{ width: '100%', minHeight: 46, border: '1px solid #CBD5E1', borderRadius: 10, background: '#FFFFFF', color: '#0F172A', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <IconRefresh size={15} />
          <span>{t('riderUpdateFooterBtn')}</span>
        </button>
      </div>
    </div>
  );
};
