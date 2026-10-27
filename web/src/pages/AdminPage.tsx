import React, { useCallback, useEffect, useState } from 'react';
import { staffApi, StaffSession } from '../api/role-api';
import { formatBaht, OrderEvent, StaffOrder } from '../api/schemas';
import { AdminCustomersPanel } from '../components/AdminCustomersPanel';
import { AdminProductsPanel } from '../components/AdminProductsPanel';
import { AdminRidersPanel } from '../components/AdminRidersPanel';
import { AdminStationsPanel } from '../components/AdminStationsPanel';
import { AdminUsersPanel } from '../components/AdminUsersPanel';

interface Props {
  staffSession: StaffSession;
  onLogout: () => void;
  onNotify: (msg: string) => void;
}

type AdminSection = 'users' | 'products' | 'stations' | 'riders' | 'customers' | 'orders';

export const AdminPage: React.FC<Props> = ({ staffSession, onLogout, onNotify }) => {
  const [section, setSection] = useState<AdminSection>('users');
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [mismatches, setMismatches] = useState<StaffOrder[]>([]);
  const [auditOrderId, setAuditOrderId] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<OrderEvent[]>([]);
  const [resolveNote, setResolveNote] = useState<Record<string, string>>({});

  const loadAdmin = useCallback(async () => {
    try {
      const [all, mis] = await Promise.all([
        staffApi.listOrders(undefined, 'dev-admin'),
        staffApi.bagMismatches(),
      ]);
      setOrders(all);
      setMismatches(mis);
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'โหลดข้อมูลแอดมินไม่สำเร็จ');
    }
  }, [onNotify]);

  useEffect(() => {
    void loadAdmin();
  }, [loadAdmin]);

  const handleOpenAudit = async (orderId: string) => {
    setAuditOrderId(auditOrderId === orderId ? null : orderId);
    if (auditOrderId === orderId) return;
    try {
      setAuditEvents(await staffApi.orderEvents(orderId));
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'ดึง Audit Trail ไม่สำเร็จ');
    }
  };

  const handleResolveBags = async (o: StaffOrder) => {
    const note = (resolveNote[o.id] ?? 'ตรวจสอบกับคลังและไรเดอร์แล้ว').trim();
    try { await staffApi.resolveBags(o.id, note); onNotify(`เคลียร์ยอดถุงไม่ตรง #${o.code} → CLOSED_WITH_RETURN`); await loadAdmin(); }
    catch (e) { onNotify(e instanceof Error ? e.message : 'เคลียร์ยอดถุงไม่สำเร็จ'); }
  };

  const handleVerifySlip = async (o: StaffOrder) => {
    try { await staffApi.verifyPayment(o.id); onNotify(`ยืนยันสลิปออเดอร์ #${o.code} → PAID`); await loadAdmin(); }
    catch (e) { onNotify(e instanceof Error ? e.message : 'ยืนยันสลิปไม่สำเร็จ'); }
  };

  const handleReschedule = async (o: StaffOrder) => {
    try { await staffApi.reschedule(o.id, 'แอดมินนัดส่งใหม่'); onNotify(`นัดส่งใหม่ #${o.code} → CONFIRMED`); await loadAdmin(); }
    catch (e) { onNotify(e instanceof Error ? e.message : 'นัดส่งใหม่ไม่สำเร็จ'); }
  };

  const handleUnlockOtp = async (o: StaffOrder) => {
    try { await staffApi.unlockOtp(o.id); onNotify(`ปลดล็อก OTP ออเดอร์ #${o.code} เรียบร้อย`); await loadAdmin(); }
    catch (e) { onNotify(e instanceof Error ? e.message : 'ปลดล็อก OTP ไม่สำเร็จ'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#0F2236', color: '#FFFFFF', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>ระบบบริหารจัดการหลังบ้าน (Backend Web)</div>
            <div style={{ fontSize: 12, color: '#A8E6C1' }}>
              🔐 ผู้ใช้งาน: <b>{staffSession.user.name}</b> ({staffSession.user.username || staffSession.user.role})
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={loadAdmin} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #33475B', background: '#1C3550', color: '#FFFFFF', fontSize: 12, cursor: 'pointer' }}>
              🔄 รีเฟรช
            </button>
            <button type="button" onClick={onLogout} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: '#C2255C', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              🚪 ออกจากระบบ
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 }}>
          {([
            { id: 'users', label: '👤 จัดการผู้ใช้ (CRUD)' },
            { id: 'products', label: '🛒 สินค้า & LINE Menu' },
            { id: 'stations', label: '🚰 ตู้กดน้ำ & สต็อกถุง' },
            { id: 'riders', label: '🛵 จัดการไรเดอร์' },
            { id: 'customers', label: '🏠 สมาชิก & วงเงิน' },
            { id: 'orders', label: `🚨 ออเดอร์ (${mismatches.length})` },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              style={{
                minHeight: 38,
                borderRadius: 10,
                border: 'none',
                background: section === tab.id ? '#0B6E8A' : '#1C3550',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {section === 'users' && <AdminUsersPanel onNotify={onNotify} />}
        {section === 'products' && <AdminProductsPanel onNotify={onNotify} />}
        {section === 'stations' && <AdminStationsPanel onNotify={onNotify} />}
        {section === 'riders' && <AdminRidersPanel onNotify={onNotify} />}
        {section === 'customers' && <AdminCustomersPanel onNotify={onNotify} />}

        {section === 'orders' && (
          <>
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

            <div style={{ fontSize: 15, fontWeight: 700 }}>รายการออเดอร์ทั้งหมด ({orders.length})</div>
            {orders.map((o) => (
              <div key={o.id} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>#{o.code} · {formatBaht(o.totalSatang)}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, background: '#E6EEF9', color: '#123F85', padding: '3px 8px', borderRadius: 8 }}>{o.status}</span>
                </div>
                <div style={{ fontSize: 12, color: '#4A5B6E' }}>
                  การชำระเงิน: {o.paymentMethod} ({o.paymentStatus}) · ถุงแจ้งคืน: {o.expectBagReturn} ใบ
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button type="button" onClick={() => handleOpenAudit(o.id)} style={{ minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #1A56B0', background: '#FFFFFF', color: '#1A56B0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    📜 ดู Audit Trail
                  </button>
                  {o.paymentStatus === 'PENDING_VERIFY' && (
                    <button type="button" onClick={() => handleVerifySlip(o)} style={{ minHeight: 36, padding: '0 10px', borderRadius: 8, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      ✓ อนุมัติสลิปโอนเงิน
                    </button>
                  )}
                  {o.status === 'FAILED_DELIVERY' && (
                    <button type="button" onClick={() => handleReschedule(o)} style={{ minHeight: 36, padding: '0 10px', borderRadius: 8, border: 'none', background: '#0B6E8A', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      🔁 นัดส่งใหม่
                    </button>
                  )}
                  <button type="button" onClick={() => handleUnlockOtp(o)} style={{ minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #DCE4EC', background: '#F8FAFC', color: '#33475B', fontSize: 12, cursor: 'pointer' }}>
                    🔓 ปลดล็อก OTP
                  </button>
                </div>

                {auditOrderId === o.id && (
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 10, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontWeight: 700 }}>Audit Trail ({auditEvents.length} รายการ):</div>
                    {auditEvents.map((ev) => (
                      <div key={ev.id} style={{ color: '#33475B' }}>
                        • [{ev.actorRole}] {ev.fromStatus ?? 'START'} → <b>{ev.toStatus}</b> {ev.note ? `(${ev.note})` : ''} {ev.photoUrl ? '📷' : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
