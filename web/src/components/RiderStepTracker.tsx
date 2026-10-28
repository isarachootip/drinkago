import React from 'react';
import { RiderJob } from '../api/schemas';
import { getRiderTargetLocation, getRiderWorkflowSteps } from '../domain/rider-steps';

interface Props {
  job: RiderJob;
  onPrimaryAction: (job: RiderJob) => void;
}

export const RiderStepTracker: React.FC<Props> = ({ job, onPrimaryAction }) => {
  const isClaimed = Boolean(job.riderId);
  const steps = getRiderWorkflowSteps(job.status, isClaimed);
  const targetLocation = getRiderTargetLocation(job.status, isClaimed);
  const hasStationCoords = job.station?.lat != null && job.station?.lng != null;
  const stationHighlight = targetLocation === 'station';
  const customerHighlight = targetLocation === 'customer';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* บล็อกที่ 1: แผนที่นำทางอัจฉริยะ (ไฮไลต์เฉพาะจุดหมายของขั้นตอนปัจจุบัน) */}
      <div style={{ background: '#F8FAFC', border: '1px solid #DCE4EC', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ fontWeight: 700, color: stationHighlight ? '#0B6E8A' : '#1A56B0' }}>
            {stationHighlight ? '🎯 จุดหมายตอนนี้: ไปที่ตู้กดน้ำก่อน (ขั้นที่ 1–3)' : '🎯 จุดหมายตอนนี้: ไปส่งที่บ้านลูกค้า (ขั้นที่ 4–5)'}
          </span>
          {job.customerPhone && (
            <a
              href={`tel:${job.customerPhone}`}
              style={{ fontSize: 12, fontWeight: 700, color: '#0F2236', textDecoration: 'none', background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '3px 8px', borderRadius: 8 }}
            >
              📞 โทรหาลูกค้า
            </a>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hasStationCoords && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${job.station!.lat},${job.station!.lng}`}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1,
                minHeight: 40,
                borderRadius: 10,
                background: stationHighlight ? '#0B6E8A' : '#FFFFFF',
                color: stationHighlight ? '#FFFFFF' : '#64748B',
                border: stationHighlight ? 'none' : '1px dashed #CBD5E1',
                fontSize: 12,
                fontWeight: stationHighlight ? 700 : 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 10px',
              }}
            >
              {stationHighlight ? '🚰 1. นำทางไปตู้กดน้ำ (ไปจุดนี้ก่อน)' : '🚰 ตู้กดน้ำ (รับน้ำแล้ว ✓)'}
            </a>
          )}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${job.address.lat},${job.address.lng}`}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: 10,
              background: customerHighlight ? '#1A56B0' : '#FFFFFF',
              color: customerHighlight ? '#FFFFFF' : '#64748B',
              border: customerHighlight ? 'none' : '1px dashed #CBD5E1',
              fontSize: 12,
              fontWeight: customerHighlight ? 700 : 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 10px',
            }}
          >
            {customerHighlight ? '🏠 2. นำทางไปบ้านลูกค้า (ไปจุดนี้ตอนนี้)' : '🏠 พิกัดบ้านลูกค้า (รอรับน้ำเสร็จ)'}
          </a>
        </div>
      </div>

      {/* บล็อกที่ 2: ลำดับขั้นตอนการทำงานของไรเดอร์ 1–5 (กดได้ทีละขั้นตามลำดับ) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#33475B' }}>
          📋 ลำดับขั้นตอนการทำงานไรเดอร์ (ทำทีละขั้นตามลำดับ 1 → 5):
        </div>

        {steps.map((step) => {
          const isDone = step.state === 'done';
          const isCurrent = step.state === 'current';
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
                gap: isCurrent ? 10 : 2,
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
