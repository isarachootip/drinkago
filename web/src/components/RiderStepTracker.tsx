import React from 'react';
import { RiderJob } from '../api/schemas';
import { buildCustomerMapsUrl, buildStationMapsUrl, getStepInlineNavTarget } from '../domain/navigation';
import { getRiderTargetLocation, getRiderWorkflowSteps } from '../domain/rider-steps';
import { RiderMapNavBox } from './RiderMapNavBox';

interface Props {
  job: RiderJob;
  onPrimaryAction: (job: RiderJob) => void;
}

export const RiderStepTracker: React.FC<Props> = ({ job, onPrimaryAction }) => {
  const isClaimed = Boolean(job.riderId);
  const steps = getRiderWorkflowSteps(job.status, isClaimed);
  const targetLocation = getRiderTargetLocation(job.status, isClaimed);
  const stationMapsUrl = buildStationMapsUrl(job.station);
  const customerMaps = buildCustomerMapsUrl(job.address);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <RiderMapNavBox job={job} targetLocation={targetLocation} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#33475B' }}>
          📋 ลำดับขั้นตอนการทำงานไรเดอร์ (ทำทีละขั้นตามลำดับ 1 → 5):
        </div>

        {steps.map((step) => {
          const isDone = step.state === 'done';
          const isCurrent = step.state === 'current';
          const inlineNav = isCurrent ? getStepInlineNavTarget(step.stepNumber) : null;
          const inlineMapUrl =
            inlineNav === 'station' ? stationMapsUrl : inlineNav === 'customer' ? customerMaps.url : null;
          const inlineMapLabel =
            inlineNav === 'station'
              ? `🗺️ เปิด Google Maps นำทางไปตู้กดน้ำ${job.station?.code ? ` (${job.station.code})` : ''}`
              : customerMaps.mode === 'address_query'
                ? '🗺️ เปิด Google Maps นำทางไปบ้านลูกค้า (ค้นตามชื่อที่อยู่)'
                : '🗺️ เปิด Google Maps นำทางไปบ้านลูกค้า (พิกัด GPS)';

          return (
            <div
              key={step.stepNumber}
              style={{
                borderRadius: 12,
                padding: isCurrent ? '12px' : '8px 12px',
                background: isDone ? '#F0FDF4' : isCurrent ? '#EFF6FF' : '#F8FAFC',
                border: isDone ? '1px solid #BBF7D0' : isCurrent ? '2px solid #1A56B0' : '1px solid #E2E8F0',
                opacity: step.state === 'locked' ? 0.65 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: isCurrent ? 8 : 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{isDone ? '✅' : isCurrent ? '👉' : '🔒'}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isDone ? '#166534' : isCurrent ? '#0F2236' : '#64748B' }}>
                      {step.title}
                    </span>
                    <span style={{ fontSize: 11, color: isDone ? '#15803D' : isCurrent ? '#33475B' : '#94A3B8' }}>
                      {step.subtitle}
                    </span>
                  </div>
                </div>
                {isDone && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                    เสร็จแล้ว ✓
                  </span>
                )}
                {step.state === 'locked' && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', background: '#E2E8F0', padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                    รอขั้นก่อนหน้า
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
                    minHeight: 44,
                    boxSizing: 'border-box',
                    borderRadius: 10,
                    background: '#E8F8EE',
                    color: '#058C3B',
                    border: '1.5px solid #058C3B',
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 10px',
                    textAlign: 'center',
                  }}
                >
                  {inlineMapLabel}
                </a>
              )}

              {isCurrent && (
                <button
                  type="button"
                  onClick={() => onPrimaryAction(job)}
                  style={{
                    width: '100%',
                    minHeight: 48,
                    border: 'none',
                    borderRadius: 10,
                    background: step.buttonColor,
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(26,86,176,0.2)',
                  }}
                >
                  {step.actionLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
