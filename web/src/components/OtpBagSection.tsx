import React, { useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { IconCamera, IconCheckCircle } from './icons/ActionIcons';
import { IconBag } from './icons/Icons';

interface Props {
  digits: [string, string, string, string];
  onDigitChange: (idx: number, val: string) => void;
  expectedBags: number;
  bagsCollected: number;
  onChangeBags: (next: number) => void;
  bagPhotoUrl: string;
  uploading: boolean;
  onUploadBag: (file?: File | null) => void;
}

export const OtpBagSection: React.FC<Props> = ({
  digits,
  onDigitChange,
  expectedBags,
  bagsCollected,
  onChangeBags,
  bagPhotoUrl,
  uploading,
  onUploadBag,
}) => {
  const { t } = useI18n();
  const bagFileRef = useRef<HTMLInputElement | null>(null);
  const otpRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ];

  const handleDigit = (idx: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    onDigitChange(idx, clean);
    if (clean && idx < 3) {
      otpRefs[idx + 1].current?.focus();
    }
  };

  return (
    <>
      <div className="dg-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label htmlFor="otp-0" style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
          {t('otpSectionTitle')}
        </label>
        <div dir="ltr" style={{ display: 'flex', gap: 10 }}>
          {digits.map((d, idx) => (
            <input
              key={idx}
              id={`otp-${idx}`}
              ref={otpRefs[idx]}
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(idx, e.target.value)}
              aria-label={`OTP ${idx + 1}`}
              className="dg-num"
              style={{
                width: 54,
                height: 54,
                border: d ? '1.5px solid #1D4ED8' : '1px solid #CBD5E1',
                borderRadius: 10,
                textAlign: 'center',
                fontSize: 22,
                fontWeight: 700,
                color: '#0F172A',
                background: d ? '#F8FAFC' : '#FFFFFF',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#64748B' }}>{t('otpHintLine')}</span>
      </div>

      <div className="dg-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
            <IconBag size={15} style={{ color: '#475569' }} />
            <span>{t('bagSectionTitle')}</span>
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#92400E', background: '#FEF3C7', padding: '3px 10px', borderRadius: 99 }}>
            {t('bagExpectedBadge', { count: expectedBags })}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1, fontSize: 13, color: '#334155', fontWeight: 500 }}>{t('bagActualCount')}</span>
          <button
            type="button"
            onClick={() => onChangeBags(Math.max(0, bagsCollected - 1))}
            aria-label="-"
            style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 18, fontWeight: 600, cursor: 'pointer', color: '#0F172A' }}
          >
            −
          </button>
          <span className="dg-num" style={{ width: 32, textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
            {bagsCollected}
          </span>
          <button
            type="button"
            onClick={() => onChangeBags(bagsCollected + 1)}
            aria-label="+"
            style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 18, fontWeight: 600, cursor: 'pointer', color: '#0F172A' }}
          >
            +
          </button>
        </div>
        {bagsCollected > 0 && (
          <>
            <input ref={bagFileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" style={{ display: 'none' }} onChange={(e) => onUploadBag(e.target.files?.[0])} />
            <button
              type="button"
              onClick={() => bagFileRef.current?.click()}
              disabled={uploading}
              className="dg-btn-icon"
              style={{
                minHeight: 42,
                border: bagPhotoUrl ? '1px solid #A7F3D0' : '1px solid #CBD5E1',
                borderRadius: 10,
                background: bagPhotoUrl ? '#ECFDF5' : '#F8FAFC',
                color: bagPhotoUrl ? '#047857' : '#0F172A',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {bagPhotoUrl ? <IconCheckCircle size={15} /> : <IconCamera size={15} />}
              <span>{bagPhotoUrl ? t('bagPhotoAttached') : t('bagTakePhotoBtn')}</span>
            </button>
            {!bagPhotoUrl && (
              <button
                type="button"
                onClick={() => onUploadBag(null)}
                disabled={uploading}
                style={{ minHeight: 34, borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#475569', fontSize: 12, cursor: 'pointer' }}
              >
                {t('podUseDemoPhoto')}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
};
