import React, { useRef } from 'react';

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
      {/* 2. รหัสยืนยัน 4 หลักจากลูกค้า */}
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label htmlFor="otp-0" style={{ fontSize: 15, fontWeight: 600 }}>
          2. รหัสยืนยัน 4 หลักจากลูกค้า
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          {digits.map((d, idx) => (
            <input
              key={idx}
              id={`otp-${idx}`}
              ref={otpRefs[idx]}
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(idx, e.target.value)}
              aria-label={`รหัสหลักที่ ${idx + 1}`}
              style={{ width: 56, height: 56, border: d ? '2px solid #1A56B0' : '1px solid #9AABBD', borderRadius: 12, textAlign: 'center', fontSize: 22, fontWeight: 700, color: '#0F2236' }}
            />
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#4A5B6E' }}>ลูกค้าดูรหัส 4 หลักได้ในข้อความแจ้งเตือน LINE ของออเดอร์นี้</span>
      </div>

      {/* 3. รับถุงคืน (ขั้นที่ 7) */}
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '2px solid #C2255C', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>3. รับถุงคืน (ขั้นที่ 7)</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#9B1B49', background: '#FCE8EF', padding: '3px 10px', borderRadius: 10 }}>
            ลูกค้าแจ้งไว้ {expectedBags} ใบ
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1, fontSize: 14, color: '#33475B' }}>จำนวนที่รับจริง</span>
          <button type="button" onClick={() => onChangeBags(Math.max(0, bagsCollected - 1))} aria-label="ลดจำนวนถุงที่รับ" style={{ width: 44, height: 44, borderRadius: 22, border: '1px solid #DCE4EC', background: '#FFFFFF', fontSize: 20, cursor: 'pointer' }}>
            −
          </button>
          <span style={{ width: 32, textAlign: 'center', fontSize: 20, fontWeight: 700 }}>{bagsCollected}</span>
          <button type="button" onClick={() => onChangeBags(bagsCollected + 1)} aria-label="เพิ่มจำนวนถุงที่รับ" style={{ width: 44, height: 44, borderRadius: 22, border: '1px solid #DCE4EC', background: '#FFFFFF', fontSize: 20, cursor: 'pointer' }}>
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
              style={{ minHeight: 44, border: '1px solid #F3C4D4', borderRadius: 12, background: bagPhotoUrl ? '#E3F3E9' : '#FCE8EF', color: bagPhotoUrl ? '#17613A' : '#9B1B49', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {bagPhotoUrl ? '✓ แนบรูปถุงที่รับคืนแล้ว' : '📷 ถ่ายรูปถุงที่รับคืน'}
            </button>
            {!bagPhotoUrl && (
              <button type="button" onClick={() => onUploadBag(null)} disabled={uploading} style={{ minHeight: 36, borderRadius: 8, border: '1px solid #F3C4D4', background: '#FFF5F8', color: '#9B1B49', fontSize: 12, cursor: 'pointer' }}>
                ใช้รูปจำลองถุงคืน (Dev Mode)
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
};
