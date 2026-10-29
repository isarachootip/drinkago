import React, { useState } from 'react';
import { staffApi } from '../api/role-api';
import { formatBaht, OrderEvent, StaffOrder } from '../api/schemas';
import { AdminViewMode, getSavedViewMode, ViewModeToggle } from './ViewModeToggle';

interface Props {
  orders: StaffOrder[];
  mismatches: StaffOrder[];
  onRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
  viewMode?: AdminViewMode;
  onViewModeChange?: (mode: AdminViewMode) => void;
}

export const AdminOrdersPanel: React.FC<Props> = ({ orders, mismatches, onRefresh, onNotify, viewMode: propMode, onViewModeChange }) => {
  const [localMode, setLocalMode] = useState<AdminViewMode>(() => getSavedViewMode());
  const viewMode = propMode ?? localMode;
  const handleModeChange = (m: AdminViewMode) => { setLocalMode(m); onViewModeChange?.(m); };
  const [auditOrderId, setAuditOrderId] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<OrderEvent[]>([]);
  const [resolveNote, setResolveNote] = useState<Record<string, string>>({});
  const [clearing, setClearing] = useState(false);

  const runAction = async (fn: () => Promise<void>, fallbackErr: string) => {
    try { await fn(); } catch (e) { onNotify(e instanceof Error ? e.message : fallbackErr); }
  };

  const handleClearAllOrders = async () => {
    if (!window.confirm('ยืนยันการล้างข้อมูลออเดอร์เก่าทั้งหมด (รวมถึงประวัติถุงค้างและรีเซ็ตสต็อกถุงประจำตู้กดน้ำ 50 ใบ/ตู้) เพื่อเริ่มทดสอบใหม่หรือไม่?')) return;
    setClearing(true);
    try {
      const res = await staffApi.clearAllOrders();
      onNotify(`ล้างออเดอร์เก่าเรียบร้อย (${res.clearedOrders} ออเดอร์) · รีเซ็ตสต็อกถุง ${res.restockedStations} ตู้ พร้อมทดสอบใหม่`);
      setAuditOrderId(null);
      await onRefresh();
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'ล้างออเดอร์ไม่สำเร็จ');
    } finally {
      setClearing(false);
    }
  };

  const handleOpenAudit = (orderId: string) => {
    setAuditOrderId(auditOrderId === orderId ? null : orderId);
    if (auditOrderId === orderId) return;
    return runAction(async () => setAuditEvents(await staffApi.orderEvents(orderId)), 'ดึง Audit Trail ไม่สำเร็จ');
  };

  const handleResolveBags = (o: StaffOrder) => runAction(async () => {
    const note = (resolveNote[o.id] ?? 'ตรวจสอบกับคลังและไรเดอร์แล้ว').trim();
    await staffApi.resolveBags(o.id, note);
    onNotify(`เคลียร์ยอดถุงไม่ตรง #${o.code} → CLOSED_WITH_RETURN`);
    await onRefresh();
  }, 'เคลียร์ยอดถุงไม่สำเร็จ');

  const handleVerifySlip = (o: StaffOrder) => runAction(async () => {
    await staffApi.verifyPayment(o.id);
    onNotify(`ยืนยันสลิปออเดอร์ #${o.code} → PAID`);
    await onRefresh();
  }, 'ยืนยันสลิปไม่สำเร็จ');

  const handleReschedule = (o: StaffOrder) => runAction(async () => {
    await staffApi.reschedule(o.id, 'แอดมินนัดส่งใหม่');
    onNotify(`นัดส่งใหม่ #${o.code} → CONFIRMED`);
    await onRefresh();
  }, 'นัดส่งใหม่ไม่สำเร็จ');

  const handleUnlockOtp = (o: StaffOrder) => runAction(async () => {
    await staffApi.unlockOtp(o.id);
    onNotify(`ปลดล็อก OTP ออเดอร์ #${o.code} เรียบร้อย`);
    await onRefresh();
  }, 'ปลดล็อก OTP ไม่สำเร็จ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {mismatches.length > 0 && (
        <div style={{ background: '#FFF5F8', borderRadius: 14, border: '2px solid #C2255C', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#9B1B49' }}>⚠️ ออเดอร์ยอดถุงคืนไม่ตรง ({mismatches.length})</div>
          {mismatches.map((m) => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#FFFFFF', padding: 10, borderRadius: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>#{m.code} · สถานะ {m.status}</div>
              <input
                placeholder="ระบุหมายเหตุการเคลียร์ยอดถุง..."
                value={resolveNote[m.id] ?? 'ตรวจสอบกับไรเดอร์และคลังเรียบร้อย'}
                onChange={(e) => setResolveNote({ ...resolveNote, [m.id]: e.target.value })}
                style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD', fontSize: 13 }}
              />
              <button type="button" onClick={() => handleResolveBags(m)} style={{ minHeight: 40, borderRadius: 8, border: 'none', background: '#C2255C', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}>
                ยืนยันเคลียร์ยอดถุงและปิดงาน (CLOSED_WITH_RETURN)
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <ViewModeToggle mode={viewMode} onChange={handleModeChange} title="รายการออเดอร์ทั้งหมด" count={orders.length} />
        <button type="button" disabled={clearing} onClick={handleClearAllOrders} style={{ minHeight: 36, padding: '0 14px', borderRadius: 10, border: 'none', background: '#B91C1C', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: clearing ? 'wait' : 'pointer' }}>
          {clearing ? '⏳ กำลังล้างออเดอร์...' : `🗑️ ล้างออเดอร์เก่าทั้งหมด (${orders.length})`}
        </button>
      </div>

      {auditOrderId && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '2px solid #1A56B0', padding: 12, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: '#1A56B0' }}>📜 Audit Trail ({auditEvents.length} รายการ):</div>
            <button type="button" onClick={() => setAuditOrderId(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>✕ ปิด</button>
          </div>
          {auditEvents.map((ev) => (
            <div key={ev.id} style={{ color: '#33475B' }}>
              • [{ev.actorRole}] {ev.fromStatus ?? 'START'} → <b>{ev.toStatus}</b> {ev.note ? `(${ev.note})` : ''} {ev.photoUrl ? '📷' : ''}
            </div>
          ))}
        </div>
      )}

      {viewMode === 'grid' ? (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
            <thead>
              <tr style={{ background: '#F1F5F9', color: '#0F2236', textAlign: 'left', borderBottom: '1px solid #DCE4EC' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>รหัสออเดอร์</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>สถานะ</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>ยอดชำระ</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>การชำระเงิน</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>ถุงแจ้งคืน</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid #EEF2F6', background: auditOrderId === o.id ? '#F0F9FF' : '#FFFFFF' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0F2236' }}>#{o.code}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#E6EEF9', color: '#123F85', padding: '3px 8px', borderRadius: 8 }}>{o.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#1A56B0' }}>{formatBaht(o.totalSatang)}</td>
                  <td style={{ padding: '10px 12px', color: '#4A5B6E' }}>{o.paymentMethod} ({o.paymentStatus})</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{o.expectBagReturn} ใบ</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button type="button" onClick={() => handleOpenAudit(o.id)} style={{ minHeight: 30, padding: '0 8px', borderRadius: 8, border: '1px solid #1A56B0', background: '#FFFFFF', color: '#1A56B0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📜 Audit</button>
                      {o.paymentStatus === 'PENDING_VERIFY' && (
                        <button type="button" onClick={() => handleVerifySlip(o)} style={{ minHeight: 30, padding: '0 8px', borderRadius: 8, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ สลิป</button>
                      )}
                      {o.status === 'FAILED_DELIVERY' && (
                        <button type="button" onClick={() => handleReschedule(o)} style={{ minHeight: 30, padding: '0 8px', borderRadius: 8, border: 'none', background: '#0B6E8A', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔁 นัดใหม่</button>
                      )}
                      <button type="button" onClick={() => handleUnlockOtp(o)} style={{ minHeight: 30, padding: '0 8px', borderRadius: 8, border: '1px solid #DCE4EC', background: '#F8FAFC', color: '#33475B', fontSize: 12, cursor: 'pointer' }}>🔓 OTP</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {orders.map((o) => (
            <div key={o.id} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8, boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>#{o.code} · {formatBaht(o.totalSatang)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, background: '#E6EEF9', color: '#123F85', padding: '3px 8px', borderRadius: 8 }}>{o.status}</span>
              </div>
              <div style={{ fontSize: 12, color: '#4A5B6E' }}>
                การชำระเงิน: {o.paymentMethod} ({o.paymentStatus}) · ถุงแจ้งคืน: {o.expectBagReturn} ใบ
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 6, borderTop: '1px solid #EEF2F6' }}>
                <button type="button" onClick={() => handleOpenAudit(o.id)} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #1A56B0', background: '#FFFFFF', color: '#1A56B0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📜 ดู Audit Trail</button>
                {o.paymentStatus === 'PENDING_VERIFY' && (
                  <button type="button" onClick={() => handleVerifySlip(o)} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ อนุมัติสลิปโอนเงิน</button>
                )}
                {o.status === 'FAILED_DELIVERY' && (
                  <button type="button" onClick={() => handleReschedule(o)} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: 'none', background: '#0B6E8A', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔁 นัดส่งใหม่</button>
                )}
                <button type="button" onClick={() => handleUnlockOtp(o)} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #DCE4EC', background: '#F8FAFC', color: '#33475B', fontSize: 12, cursor: 'pointer' }}>🔓 ปลดล็อก OTP</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
