import React, { useState } from 'react';
import { staffApi } from '../api/role-api';
import { formatBaht, OrderEvent, StaffOrder } from '../api/schemas';
import { IconAlert, IconCheck, IconLock, IconRefresh, IconTrash } from './icons/ActionIcons';
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
      onNotify(`ล้างออเดอร์เก่าเรียบร้อย (${res.clearedOrders} ออเดอร์) · รีเซ็ตสต็อกถุง ${res.restockedStations} ตู้`);
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
        <div className="dg-card" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#92400E' }}>
            <IconAlert size={16} />
            <span>ออเดอร์ยอดถุงคืนไม่ตรง ({mismatches.length})</span>
          </div>
          {mismatches.map((m) => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#FFFFFF', border: '1px solid #FDE68A', padding: 10, borderRadius: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                <span className="dg-num">#{m.code}</span> · สถานะ {m.status}
              </div>
              <input
                placeholder="ระบุหมายเหตุการเคลียร์ยอดถุง..."
                value={resolveNote[m.id] ?? 'ตรวจสอบกับไรเดอร์และคลังเรียบร้อย'}
                onChange={(e) => setResolveNote({ ...resolveNote, [m.id]: e.target.value })}
                style={{ minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
              />
              <button type="button" onClick={() => handleResolveBags(m)} style={{ minHeight: 38, borderRadius: 8, border: 'none', background: '#0F172A', color: '#FFFFFF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                ยืนยันเคลียร์ยอดถุงและปิดงาน (CLOSED_WITH_RETURN)
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <ViewModeToggle mode={viewMode} onChange={handleModeChange} title="รายการออเดอร์ทั้งหมด" count={orders.length} />
        <button type="button" disabled={clearing} onClick={handleClearAllOrders} className="dg-btn-icon" style={{ minHeight: 34, padding: '0 12px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 12, fontWeight: 600, cursor: clearing ? 'wait' : 'pointer' }}>
          <IconTrash size={13} />
          <span>{clearing ? 'กำลังล้างออเดอร์...' : `ล้างออเดอร์เก่าทั้งหมด (${orders.length})`}</span>
        </button>
      </div>

      {auditOrderId && (
        <div className="dg-card" style={{ border: '1.5px solid #1D4ED8', padding: 14, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: '#0F172A' }}>Audit Trail ({auditEvents.length} รายการ)</div>
            <button type="button" onClick={() => setAuditOrderId(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>ปิด</button>
          </div>
          {auditEvents.map((ev) => (
            <div key={ev.id} style={{ color: '#334155' }}>
              • [{ev.actorRole}] {ev.fromStatus ?? 'START'} → <strong>{ev.toStatus}</strong> {ev.note ? `(${ev.note})` : ''} {ev.photoUrl ? '[Photo]' : ''}
            </div>
          ))}
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="dg-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', color: '#475569', textAlign: 'left', borderBottom: '1px solid #E2E8F0', fontSize: 12 }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>รหัสออเดอร์</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>สถานะ</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>ยอดชำระ</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>การชำระเงิน</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>ถุงแจ้งคืน</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid #F1F5F9', background: auditOrderId === o.id ? '#EFF6FF' : '#FFFFFF' }}>
                  <td className="dg-num" style={{ padding: '10px 12px', fontWeight: 700, color: '#0F172A' }}>#{o.code}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, background: '#F1F5F9', color: '#334155', padding: '2px 8px', borderRadius: 6 }}>{o.status}</span>
                  </td>
                  <td className="dg-num" style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>{formatBaht(o.totalSatang)}</td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>{o.paymentMethod} ({o.paymentStatus})</td>
                  <td className="dg-num" style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>{o.expectBagReturn}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button type="button" onClick={() => handleOpenAudit(o.id)} style={{ minHeight: 28, padding: '0 8px', borderRadius: 6, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Audit</button>
                      {o.paymentStatus === 'PENDING_VERIFY' && (
                        <button type="button" onClick={() => handleVerifySlip(o)} className="dg-btn-icon" style={{ minHeight: 28, padding: '0 8px', borderRadius: 6, border: 'none', background: '#059669', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><IconCheck size={12} /><span>สลิป</span></button>
                      )}
                      {o.status === 'FAILED_DELIVERY' && (
                        <button type="button" onClick={() => handleReschedule(o)} className="dg-btn-icon" style={{ minHeight: 28, padding: '0 8px', borderRadius: 6, border: 'none', background: '#1D4ED8', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><IconRefresh size={12} /><span>นัดใหม่</span></button>
                      )}
                      <button type="button" onClick={() => handleUnlockOtp(o)} className="dg-btn-icon" style={{ minHeight: 28, padding: '0 8px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontSize: 12, cursor: 'pointer' }}><IconLock size={12} /><span>OTP</span></button>
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
            <div key={o.id} className="dg-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8, boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="dg-num" style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>#{o.code} · {formatBaht(o.totalSatang)}</span>
                <span style={{ fontSize: 11, fontWeight: 600, background: '#F1F5F9', color: '#334155', padding: '2px 8px', borderRadius: 6 }}>{o.status}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                การชำระเงิน: {o.paymentMethod} ({o.paymentStatus}) · ถุงแจ้งคืน: <span className="dg-num">{o.expectBagReturn}</span> ใบ
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
                <button type="button" onClick={() => handleOpenAudit(o.id)} style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Audit Trail</button>
                {o.paymentStatus === 'PENDING_VERIFY' && (
                  <button type="button" onClick={() => handleVerifySlip(o)} className="dg-btn-icon" style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, border: 'none', background: '#059669', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><IconCheck size={13} /><span>อนุมัติสลิป</span></button>
                )}
                {o.status === 'FAILED_DELIVERY' && (
                  <button type="button" onClick={() => handleReschedule(o)} className="dg-btn-icon" style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, border: 'none', background: '#1D4ED8', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><IconRefresh size={13} /><span>นัดส่งใหม่</span></button>
                )}
                <button type="button" onClick={() => handleUnlockOtp(o)} className="dg-btn-icon" style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontSize: 12, cursor: 'pointer' }}><IconLock size={13} /><span>ปลดล็อก OTP</span></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
