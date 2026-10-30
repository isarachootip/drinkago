import React, { useCallback, useEffect, useState } from 'react';
import { customerApi } from '../api/role-api';
import { BagSummary, formatBaht, OrderDetail, OrderEvent, StaffOrder } from '../api/schemas';
import { IconArrowLeft, IconCheckCircle } from '../components/icons/ActionIcons';
import { IconBag } from '../components/icons/Icons';
import { LineBanner } from '../components/LineBanner';
import { PromptPayQrCard } from '../components/PromptPayQrCard';
import { FLOW_STEPS, pickDefaultTrackedOrderId, shouldShowCustomerOtp } from '../domain/customer-track';
import { uploadSelectedOrDemoPhoto } from '../domain/photo-picker';
import { canCustomerCancelOrder } from '../domain/session-gate';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  customerUser: string;
  initialOrderId: string | null;
  onBackToShop: () => void;
  onNotify: (msg: string) => void;
}

export const CustomerTrackPage: React.FC<Props> = ({ customerUser, initialOrderId, onBackToShop, onNotify }) => {
  const { t } = useI18n();
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
      const targetId = pickDefaultTrackedOrderId(mine, selectedId);
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
      <div style={{ background: '#FFFFFF', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid #E2E8F0' }}>
        <button type="button" onClick={onBackToShop} className="dg-btn-icon" style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <IconArrowLeft size={14} />
          <span>{t('trackBackToShop')}</span>
        </button>
        <select
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontWeight: 600, fontSize: 13, color: '#0F172A', background: '#FFFFFF' }}
        >
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              #{o.code} ({o.status})
            </option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <LineBanner customerUser={customerUser} />
        {!detail ? (
          <div className="dg-card" style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 14 }}>
            {t('trackNoOrders')}
          </div>
        ) : (
          <>
            {shouldShowCustomerOtp(detail.status) ? (
              <div style={{ background: '#0F172A', color: '#FFFFFF', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>{t('trackOtpHint')}</span>
                  <span className="dg-num" style={{ fontSize: 13, color: '#34D399', fontWeight: 600 }}>
                    #{detail.code} · {formatBaht(detail.totalSatang)}
                  </span>
                </div>
                <span className="dg-num" style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4, background: '#1E293B', border: '1px solid #334155', padding: '6px 14px', borderRadius: 10, color: '#F8FAFC' }}>
                  {detail.deliveryOtp ?? '----'}
                </span>
              </div>
            ) : (
              <div style={{ background: detail.status === 'CANCELLED' ? '#F8FAFC' : '#ECFDF5', color: detail.status === 'CANCELLED' ? '#475569' : '#047857', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: detail.status === 'CANCELLED' ? '1px solid #E2E8F0' : '1px solid #A7F3D0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    {detail.status === 'CANCELLED' ? t('trackCancelledTitle') : t('trackDeliveredTitle')}
                  </span>
                  <span className="dg-num" style={{ fontSize: 12 }}>
                    #{detail.code} · {formatBaht(detail.totalSatang)}
                  </span>
                </div>
              </div>
            )}

            {detail.paymentMethod === 'PROMPTPAY' && (
              <PromptPayQrCard totalSatang={detail.totalSatang} paymentStatus={detail.paymentStatus} busy={busy} onSubmitSlip={handleSubmitSlip} />
            )}

            <div className="dg-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                {t('trackCurrentStatus')}: <span style={{ color: '#1D4ED8' }}>{detail.status}</span>
              </div>
              {FLOW_STEPS.map((st) => {
                const done = reachedSet.has(st.status) || (st.status === 'CLOSED_WITH_RETURN' && reachedSet.has('CLOSED'));
                return (
                  <div key={st.status} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: done ? '#0F172A' : '#94A3B8', fontWeight: done ? 600 : 400 }}>
                    {done ? (
                      <IconCheckCircle size={16} style={{ color: '#059669' }} />
                    ) : (
                      <span style={{ width: 16, height: 16, borderRadius: 8, border: '1.5px solid #CBD5E1', display: 'inline-block', boxSizing: 'border-box', flexShrink: 0 }} />
                    )}
                    <span style={{ flex: 1 }}>{st.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="dg-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F1F5F9', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconBag size={18} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                  {t('custBagBalanceBadge', { count: bags.balance })}
                </span>
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  {t('bagExpectedBadge', { count: detail.expectBagReturn })}
                </span>
              </div>
            </div>

            {canCustomerCancelOrder(detail.status) && (
              <button type="button" onClick={handleCancel} disabled={busy} style={{ minHeight: 42, borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {t('trackCancelOrderBtn')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
