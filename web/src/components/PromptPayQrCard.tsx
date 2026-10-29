import React, { useEffect, useState } from 'react';
import { requestJson } from '../api/role-api';
import { formatBaht } from '../api/schemas';

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
        // Fallback to prototype default (อิศระ ชูทิพย์ 0636395619)
      });
  }, []);

  const qrUrl = buildPromptPayQrUrl(promptpayId, totalSatang);

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        border: '2px solid #1A56B0',
        padding: compact ? 12 : 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A56B0' }}>📲 สแกนชำระเงิน PromptPay QR</div>
      <div style={{ fontSize: 13, color: '#0F2236', fontWeight: 700 }}>
        ชื่อบัญชี: {accountName} ({formatPromptPayPhone(promptpayId)})
      </div>
      {totalSatang > 0 && (
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1E7B45', background: '#E8F8EE', padding: '4px 12px', borderRadius: 8 }}>
          ยอดโอน: {formatBaht(totalSatang)}
        </div>
      )}
      <img
        src={qrUrl}
        alt={`PromptPay QR ${accountName}`}
        style={{
          width: compact ? 160 : 200,
          height: compact ? 160 : 200,
          borderRadius: 10,
          border: '1px solid #DCE4EC',
          background: '#FFFFFF',
          padding: 6,
          objectFit: 'contain',
        }}
      />

      {paymentStatus === 'PENDING_VERIFY' && (
        <div style={{ fontSize: 13, fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '6px 12px', borderRadius: 8 }}>
          ⏳ ส่งสลิปแล้ว รอแอดมินตรวจสอบยอดโอน
        </div>
      )}
      {paymentStatus === 'PAID' && (
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E7B45', background: '#E8F8EE', padding: '6px 12px', borderRadius: 8 }}>
          ✅ ชำระเงินผ่าน PromptPay เรียบร้อยแล้ว
        </div>
      )}
      {paymentStatus === 'UNPAID' && onSubmitSlip && (
        <button
          type="button"
          onClick={onSubmitSlip}
          disabled={busy}
          style={{
            width: '100%',
            minHeight: 44,
            borderRadius: 12,
            border: 'none',
            background: '#0B6E8A',
            color: '#FFFFFF',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          📎 ยืนยันแจ้งโอน / แนบสลิป PromptPay
        </button>
      )}
    </div>
  );
};
