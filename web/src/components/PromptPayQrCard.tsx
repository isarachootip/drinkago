import React, { useEffect, useState } from 'react';
import { requestJson } from '../api/role-api';
import { formatBaht } from '../api/schemas';
import { IconCamera, IconCheckCircle } from './icons/ActionIcons';
import { IconClock } from './icons/Icons';

export const DEFAULT_PROMPTPAY_ID = '0636395619';
export const DEFAULT_PROMPTPAY_NAME = 'อิศระ ชูทิพย์';

export function formatPromptPayPhone(rawId: string): string {
  const digits = rawId.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return rawId.trim() || DEFAULT_PROMPTPAY_ID;
}

export function buildPromptPayQrUrl(promptpayId: string, totalSatang: number): string {
  const cleanId = promptpayId.replace(/\D/g, '') || DEFAULT_PROMPTPAY_ID;
  if (totalSatang <= 0) {
    return `https://promptpay.io/${encodeURIComponent(cleanId)}.png`;
  }
  const baht = totalSatang / 100;
  const amountStr = Number.isInteger(baht) ? `${baht}` : baht.toFixed(2);
  return `https://promptpay.io/${encodeURIComponent(cleanId)}/${encodeURIComponent(amountStr)}.png`;
}

interface Props {
  totalSatang: number;
  paymentStatus?: 'UNPAID' | 'PENDING_VERIFY' | 'PAID';
  busy?: boolean;
  compact?: boolean;
  onSubmitSlip?: () => void;
}

export const PromptPayQrCard: React.FC<Props> = ({
  totalSatang,
  paymentStatus,
  busy = false,
  compact = false,
  onSubmitSlip,
}) => {
  const [promptpayId, setPromptpayId] = useState(DEFAULT_PROMPTPAY_ID);
  const [accountName, setAccountName] = useState(DEFAULT_PROMPTPAY_NAME);

  useEffect(() => {
    requestJson<{ promptpayId?: string; promptpayAccountName?: string }>('/payment-config')
      .then((res) => {
        if (res.promptpayId) setPromptpayId(res.promptpayId);
        if (res.promptpayAccountName) setAccountName(res.promptpayAccountName);
      })
      .catch(() => {
        // Fallback to prototype default
      });
  }, []);

  const qrUrl = buildPromptPayQrUrl(promptpayId, totalSatang);

  return (
    <div
      className="dg-card"
      style={{
        padding: compact ? 14 : 18,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>PromptPay QR</div>
      <div style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
        {accountName} (<span className="dg-num">{formatPromptPayPhone(promptpayId)}</span>)
      </div>
      {totalSatang > 0 && (
        <div className="dg-num" style={{ fontSize: 14, fontWeight: 700, color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '4px 12px', borderRadius: 8 }}>
          {formatBaht(totalSatang)}
        </div>
      )}
      <img
        src={qrUrl}
        alt={`PromptPay QR ${accountName}`}
        style={{
          width: compact ? 156 : 196,
          height: compact ? 156 : 196,
          borderRadius: 10,
          border: '1px solid #E2E8F0',
          background: '#FFFFFF',
          padding: 6,
          objectFit: 'contain',
        }}
      />

      {paymentStatus === 'PENDING_VERIFY' && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '6px 12px', borderRadius: 8 }}>
          <IconClock size={14} />
          <span>ส่งสลิปแล้ว · รอตรวจสอบยอดโอน</span>
        </div>
      )}
      {paymentStatus === 'PAID' && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '6px 12px', borderRadius: 8 }}>
          <IconCheckCircle size={14} />
          <span>ชำระเงินผ่าน PromptPay เรียบร้อยแล้ว</span>
        </div>
      )}
      {paymentStatus === 'UNPAID' && onSubmitSlip && (
        <button
          type="button"
          onClick={onSubmitSlip}
          disabled={busy}
          className="dg-btn-icon"
          style={{
            width: '100%',
            minHeight: 42,
            borderRadius: 10,
            border: 'none',
            background: '#0F172A',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <IconCamera size={14} />
          <span>ยืนยันแจ้งโอน / แนบสลิป PromptPay</span>
        </button>
      )}
    </div>
  );
};
