import React from 'react';
import { RiderJob } from '../api/schemas';
import { buildCustomerMapsUrl, buildStationMapsUrl, getStepInlineNavTarget } from '../domain/navigation';
import { getRiderTargetLocation, getRiderWorkflowSteps } from '../domain/rider-steps';
import { useI18n } from '../i18n/I18nContext';
import { IconCheck, IconLock } from './icons/ActionIcons';
import { IconNavigation, IconTruck } from './icons/Icons';
import { RiderMapNavBox } from './RiderMapNavBox';

interface Props {
  job: RiderJob;
  onPrimaryAction: (job: RiderJob) => void;
}

export const RiderStepTracker: React.FC<Props> = ({ job, onPrimaryAction }) => {
  const { t } = useI18n();
  const isClaimed = Boolean(job.riderId);
  const steps = getRiderWorkflowSteps(job.status, isClaimed, (key) => t(key));
  const targetLocation = getRiderTargetLocation(job.status, isClaimed);
  const stationMapsUrl = buildStationMapsUrl(job.station);
  const customerMaps = buildCustomerMapsUrl(job.address);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <RiderMapNavBox job={job} targetLocation={targetLocation} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', letterSpacing: '0.01em' }}>
          {t('stepperHeader')}
        </div>

        {steps.map((step) => {
          const isDone = step.state === 'done';
          const isCurrent = step.state === 'current';
          const inlineNav = isCurrent ? getStepInlineNavTarget(step.stepNumber) : null;
          const inlineMapUrl =
            inlineNav === 'station' ? stationMapsUrl : inlineNav === 'customer' ? customerMaps.url : null;
          const inlineMapLabel =
            inlineNav === 'station'
              ? t('inlineMapStation', { code: job.station?.code ? `(${job.station.code})` : '' }).trim()
              : customerMaps.mode === 'address_query'
                ? t('inlineMapCustomerQuery')
                : t('inlineMapCustomerGps');

          return (
            <div
              key={step.stepNumber}
              style={{
                borderRadius: 12,
                padding: isCurrent ? '14px' : '10px 12px',
                background: isDone ? '#F8FAFC' : isCurrent ? '#FFFFFF' : '#F8FAFC',
                border: isDone
                  ? '1px solid #E2E8F0'
                  : isCurrent
                    ? '1.5px solid #1D4ED8'
                    : '1px solid #E2E8F0',
                boxShadow: isCurrent ? '0 4px 12px rgba(15, 23, 42, 0.06)' : 'none',
                opacity: step.state === 'locked' ? 0.68 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: isCurrent ? 10 : 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    className="dg-num"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      background: isDone ? '#ECFDF5' : isCurrent ? '#1D4ED8' : '#E2E8F0',
                      color: isDone ? '#059669' : isCurrent ? '#FFFFFF' : '#64748B',
                      border: isDone ? '1px solid #A7F3D0' : 'none',
                    }}
                  >
                    {isDone ? <IconCheck size={13} /> : step.state === 'locked' ? <IconLock size={12} /> : step.stepNumber}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: isDone ? '#334155' : isCurrent ? '#0F172A' : '#64748B',
                      }}
                    >
                      {step.title}
                    </span>
                    <span style={{ fontSize: 12, color: isCurrent ? '#475569' : '#94A3B8' }}>
                      {step.subtitle}
                    </span>
                  </div>
                </div>
                {isDone && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#047857',
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '2px 8px',
                      borderRadius: 99,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('stepDoneBadge')}
                  </span>
                )}
                {step.state === 'locked' && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#64748B',
                      background: '#F1F5F9',
                      padding: '2px 8px',
                      borderRadius: 99,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('stepLockedBadge')}
                  </span>
                )}
              </div>

              {isCurrent && inlineMapUrl && (
                <a
                  href={inlineMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: '100%',
                    minHeight: 40,
                    boxSizing: 'border-box',
                    borderRadius: 10,
                    background: '#F8FAFC',
                    color: '#0F172A',
                    border: '1px solid #CBD5E1',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    textAlign: 'center',
                  }}
                >
                  <IconNavigation size={14} style={{ color: '#1D4ED8' }} />
                  <span>{inlineMapLabel}</span>
                </a>
              )}

              {isCurrent && (
                <button
                  type="button"
                  onClick={() => onPrimaryAction(job)}
                  className="dg-btn-icon"
                  style={{
                    width: '100%',
                    minHeight: 46,
                    border: 'none',
                    borderRadius: 10,
                    background: step.buttonColor,
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <IconTruck size={16} />
                  <span>{step.actionLabel}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
