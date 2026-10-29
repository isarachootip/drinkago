import React, { useCallback, useEffect, useState } from 'react';
import { customerApi } from '../api/role-api';
import { BagSummary, formatBaht, OrderDetail, OrderEvent, StaffOrder } from '../api/schemas';
import { LineBanner } from '../components/LineBanner';
import { PromptPayQrCard } from '../components/PromptPayQrCard';
import { uploadSelectedOrDemoPhoto } from '../domain/photo-picker';
import { canCustomerCancelOrder } from '../domain/session-gate';

interface Props {
  customerUser: string;
  initialOrderId: string | null;
  onBackToShop: () => void;
  onNotify: (msg: string) => void;
}

const FLOW_STEPS: { status: string; label: string }[] = [
  { status: 'PENDING', label: '1. ลูกค้าสั่งซื้อ (PENDING)' },
  { status: 'CONFIRMED', label: '2. รับคำสั่งซื้อแล้ว (CONFIRMED)' },
  { status: 'PACKED', label: '3. พนักงานขนส่ง กดน้ำ/จัดของ (PACKED)' },
  { status: 'PICKED_UP', label: '4. ยืนยันการรับสินค้า (PICKED_UP)' },
  { status: 'OUT_FOR_DELIVERY', label: '5. วิ่งส่งสินค้า (OUT_FOR_DELIVERY)' },
  { status: 'DELIVERED', label: '6. ยืนยันการจัดส่ง (DELIVERED)' },
  { status: 'BAG_COLLECTED', label: '7. ยืนยันรับถุงขาคืน (BAG_COLLECTED)' },
  { status: 'CLOSED_WITH_RETURN', label: '8. ปิดงานพร้อมบันทึกถุงคืน' },
];

export const CustomerTrackPage: React.FC<Props> = ({ customerUser, initialOrderId, onBackToShop, onNotify }) => {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialOrderId);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [bags, setBags] = useState<BagSummary>({ balance: 0, history: [] });
  const [busy, setBusy] = useState(false);

  const loadTrack = useCallback(async () => {
    try {
      const [mine, bagSum] = await Promise.all([
        customerApi.myOrders(customerUser),
        customerApi.getBags(customerUser),
      ]);
      setOrders(mine);
      setBags(bagSum);
      const targetId = selectedId ?? mine[0]?.id ?? null;
      setSelectedId(targetId);
      if (targetId) {
        const [d, ev] = await Promise.all([
          customerApi.getOrder(targetId, customerUser),
          customerApi.getEvents(targetId, customerUser),
        ]);
        setDetail(d);
        setEvents(ev);
      }
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'ดึงข้อมูลติดตามออเดอร์ไม่สำเร็จ');
    }
  }, [customerUser, selectedId, onNotify]);

  useEffect(() => {
    void loadTrack();
  }, [loadTrack]);

  const handleSubmitSlip = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const slipUrl = await uploadSelectedOrDemoPhoto(null, `slip-${detail.code}.png`);
      await customerApi.submitSlip(detail.id, slipUrl, `SLIP-${Date.now()}`, customerUser);
      onNotify('แนบสลิป PromptPay เรียบร้อย รอแอดมินตรวจ');
      await loadTrack();
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'แนบสลิปไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await customerApi.cancelOrder(detail.id, 'ลูกค้ากดยกเลิกเอง', customerUser);
      onNotify(`ยกเลิกออเดอร์ #${detail.code} แล้ว`);
      await loadTrack();
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'ยกเลิกไม่ได้');
    } finally {
      setBusy(false);
    }
  };

  const reachedSet = new Set(events.map((e) => e.toStatus));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#FFFFFF', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #DCE4EC' }}>
        <button type="button" onClick={onBackToShop} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #DCE4EC', background: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}>
          ← กลับหน้าสั่งน้ำ
        </button>
        <select
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ minHeight: 38, padding: '0 10px', borderRadius: 10, border: '1px solid #9AABBD', fontWeight: 600 }}
        >
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              #{o.code} ({o.status})
            </option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <LineBanner customerUser={customerUser} />
        {!detail ? (
          <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 14, textAlign: 'center' }}>ยังไม่มีออเดอร์</div>
        ) : (
          <>
            {/* กล่องแสดงรหัส OTP 4 หลักสำหรับแจ้งไรเดอร์ตอนส่งน้ำ */}
            <div style={{ background: '#0F2236', color: '#FFFFFF', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12, color: '#C5D2E0' }}>รหัส OTP แจ้งไรเดอร์เมื่อรับน้ำ (ขั้นที่ 6)</span>
                <span style={{ fontSize: 13, color: '#A8E6C1' }}>#{detail.code} · {formatBaht(detail.totalSatang)}</span>
              </div>
              <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, background: '#1C3550', padding: '6px 14px', borderRadius: 12, color: '#A8E6C1' }}>
                {detail.deliveryOtp ?? '----'}
              </span>
            </div>

            {detail.paymentMethod === 'PROMPTPAY' && (
              <PromptPayQrCard
                totalSatang={detail.totalSatang}
                paymentStatus={detail.paymentStatus}
                busy={busy}
                onSubmitSlip={handleSubmitSlip}
              />
            )}

            {/* ไทม์ไลน์สถานะออเดอร์ตาม Track.dc.html */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>สถานะออเดอร์ปัจจุบัน: {detail.status}</div>
              {FLOW_STEPS.map((st) => {
                const done = reachedSet.has(st.status) || (st.status === 'CLOSED_WITH_RETURN' && reachedSet.has('CLOSED'));
                return (
                  <div key={st.status} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: done ? '#1E7B45' : '#64748B', fontWeight: done ? 600 : 400 }}>
                    <span>{done ? '✅' : '⚪'}</span>
                    <span style={{ flex: 1 }}>{st.label}</span>
                  </div>
                );
              })}
            </div>

            {/* ยอดถุงค้างของลูกค้า */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#FCE8EF', borderRadius: 14 }}>
              <span style={{ fontSize: 22 }}>🛍️</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#9B1B49' }}>ถุงค้างของคุณ {bags.balance} ใบ</span>
                <span style={{ fontSize: 12, color: '#33475B' }}>ออเดอร์นี้แจ้งคืนไว้ {detail.expectBagReturn} ใบ</span>
              </div>
            </div>

            {canCustomerCancelOrder(detail.status) && (
              <button type="button" onClick={handleCancel} disabled={busy} style={{ minHeight: 44, borderRadius: 12, border: '1px solid #C2255C', background: '#FFFFFF', color: '#C2255C', fontWeight: 600, cursor: 'pointer' }}>
                ยกเลิกคำสั่งซื้อนี้
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
