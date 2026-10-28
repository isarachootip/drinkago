import React from 'react';
import { DevAuthSettings, formatBaht, OrderDetail, orderStatusBadge, RiderJob } from '../api/schemas';
import { RiderStepTracker } from '../components/RiderStepTracker';
import { distanceMeters, formatDistance } from '../domain/geo';

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
  const active = selectedJob ?? jobs[0] ?? null;
  const remaining = jobs.filter((j) => j.id !== active?.id);
  const totalBagsToCollect = jobs.reduce((sum, j) => sum + j.expectBagReturn, 0);
  const totalCashToCollect = jobs
    .filter((j) => j.paymentMethod === 'CASH' && j.paymentStatus !== 'PAID')
    .reduce((sum, j) => sum + j.totalSatang, 0);

  const badge = active ? orderStatusBadge(active.status, Boolean(active.riderId)) : null;
  const distText = active
    ? formatDistance(distanceMeters(settings.mockLat, settings.mockLng, active.address.lat, active.address.lng))
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#0F2236', color: '#FFFFFF', padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>งานวันนี้</span>
            <span style={{ fontSize: 13, color: '#C5D2E0' }}>ผู้ใช้งาน: {settings.devUser}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F2236', background: '#A8E6C1', padding: '6px 12px', borderRadius: 14 }}>พร้อมรับงาน</span>
            <button type="button" onClick={onOpenSettings} aria-label="ตั้งค่า" style={{ minHeight: 36, padding: '0 10px', borderRadius: 10, border: '1px solid #33475B', background: '#1C3550', color: '#FFFFFF', fontSize: 12, cursor: 'pointer' }}>
              ⚙️ ตั้งค่า
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          <div style={{ background: '#1C3550', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, color: '#C5D2E0' }}>งานค้าง</span>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{jobs.length} งาน</span>
          </div>
          <div style={{ background: '#1C3550', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, color: '#C5D2E0' }}>ถุงที่ต้องรับ</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#FFB3CB' }}>{totalBagsToCollect} ใบ</span>
          </div>
          <div style={{ background: '#1C3550', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, color: '#C5D2E0' }}>เก็บเงินสด</span>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{formatBaht(totalCashToCollect)}</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!active ? (
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, textAlign: 'center', border: '1px solid #DCE4EC' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{loading ? 'กำลังโหลดงานวันนี้...' : 'ยังไม่มีงานในคิวขณะนี้'}</div>
            <div style={{ fontSize: 13, color: '#4A5B6E', marginBottom: 14 }}>เมื่อลูกค้าสั่งน้ำดื่ม ระบบจะแนะนำตู้กดน้ำที่ใกล้ที่สุดและส่งงานเข้าคิวนี้ทันทีโดยไม่ต้องรอคลัง</div>
            <button type="button" onClick={onRefresh} style={{ minHeight: 44, padding: '0 18px', borderRadius: 12, border: '1px solid #1A56B0', background: '#FFFFFF', color: '#1A56B0', fontWeight: 600, cursor: 'pointer' }}>
              🔄 รีเฟรชรายการงาน
            </button>
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '2px solid #1A56B0', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1A56B0' }}>{badge?.stepText}</span>
              <span style={{ fontSize: 13, color: '#4A5B6E' }}>#{active.code} · {distText}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 17, fontWeight: 700 }}>{active.customerName}</span>
              <span style={{ fontSize: 14, color: '#33475B' }}>
                🏠 บ้านลูกค้า: {active.address.label} · {active.address.detail}
                {active.address.note ? ` · ${active.address.note}` : ''}
              </span>
              {active.station?.name && (
                <span style={{ fontSize: 13, color: '#0B6E8A', fontWeight: 700, marginTop: 4 }}>
                  🚰 จุดกดน้ำ: {active.station.code} · {active.station.name} ({active.station.addressDetail})
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedDetail?.items.map((it) => (
                <span key={it.productId} style={{ fontSize: 13, background: '#E6EEF9', color: '#123F85', padding: '4px 10px', borderRadius: 10 }}>
                  {it.name} × {it.qty}
                </span>
              ))}
              {active.expectBagReturn > 0 && (
                <span style={{ fontSize: 13, fontWeight: 600, background: '#FCE8EF', color: '#9B1B49', padding: '4px 10px', borderRadius: 10 }}>
                  รับถุงคืน {active.expectBagReturn} ใบ
                </span>
              )}
              <span style={{ fontSize: 13, background: '#E3F3E9', color: '#17613A', padding: '4px 10px', borderRadius: 10 }}>
                {active.paymentMethod === 'CASH'
                  ? `เก็บเงินสด ${formatBaht(active.totalSatang)}`
                  : `${active.paymentMethod} (${active.paymentStatus})`}
              </span>
            </div>

            <RiderStepTracker job={active} onPrimaryAction={onPrimaryAction} />
          </div>
        )}

        {remaining.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>งานที่เหลือ ({remaining.length})</div>
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', overflow: 'hidden' }}>
              {remaining.map((job, idx) => (
                <div key={job.id} onClick={() => onSelectJob(job)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: idx < remaining.length - 1 ? '1px solid #DCE4EC' : 'none', cursor: 'pointer' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 14, background: '#E6EEF9', color: '#123F85', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{idx + 2}</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{job.customerName} · #{job.code}</span>
                    <span style={{ fontSize: 12, color: '#4A5B6E' }}>{orderStatusBadge(job.status, Boolean(job.riderId)).stepText} · {job.paymentMethod === 'CASH' ? `เงินสด ${formatBaht(job.totalSatang)}` : 'PromptPay'}</span>
                  </div>
                  {job.expectBagReturn > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 600, background: '#FCE8EF', color: '#9B1B49', padding: '3px 8px', borderRadius: 8 }}>ถุง {job.expectBagReturn}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ background: '#FFFFFF', borderTop: '1px solid #DCE4EC', padding: '12px 16px 20px' }}>
        <button type="button" onClick={onRefresh} style={{ width: '100%', minHeight: 52, border: '1px solid #DCE4EC', borderRadius: 14, background: '#FFFFFF', color: '#0F2236', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          🔄 อัปเดตสถานะงานและยอดถุงคืนคลัง
        </button>
      </div>
    </div>
  );
};
