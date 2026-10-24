import React, { useRef, useState } from 'react';
import { DevAuthSettings, EvidenceInput, RiderJob } from '../api/schemas';
import { getCurrentGps } from '../domain/geo';
import { uploadSelectedOrDemoPhoto } from '../domain/photo-picker';

interface Props {
  job: RiderJob;
  settings: DevAuthSettings;
  onSubmitFail: (payload: { evidence: EvidenceInput; reason: string }) => Promise<void>;
  onClose: () => void;
}

export const FailDeliveryModal: React.FC<Props> = ({ job, settings, onSubmitFail, onClose }) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [reason, setReason] = useState('ลูกค้าไม่อยู่ / ติดต่อไม่ได้');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleUpload = async (file?: File | null) => {
    setUploading(true);
    setErr(null);
    try {
      const url = await uploadSelectedOrDemoPhoto(file, `fail-${job.code}.png`);
      setPhotoUrl(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!photoUrl) {
      setErr('ต้องแนบรูปถ่ายหน้างานเป็นหลักฐาน');
      return;
    }
    if (!reason.trim()) {
      setErr('กรุณาระบุเหตุผลที่ส่งไม่สำเร็จ');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const gps = await getCurrentGps(settings);
      await onSubmitFail({ evidence: { photoUrl, lat: gps.lat, lng: gps.lng }, reason: reason.trim() });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'แจ้งส่งไม่สำเร็จไม่ผ่าน');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 34, 54, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#FFFFFF',
          borderRadius: 16,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, color: '#9B1B49' }}>แจ้งส่งสินค้าไม่สำเร็จ</div>
        <div style={{ fontSize: 13, color: '#4A5B6E' }}>
          #{job.code} · {job.customerName}
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
          <span>สาเหตุที่ส่งไม่สำเร็จ</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ minHeight: 44, padding: '0 10px', borderRadius: 10, border: '1px solid #9AABBD' }}
          />
        </label>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => handleUpload(e.target.files?.[0])}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            minHeight: 72,
            border: '2px dashed #9AABBD',
            borderRadius: 12,
            background: photoUrl ? '#E3F3E9' : '#F3F7FA',
            color: photoUrl ? '#17613A' : '#1A56B0',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {uploading ? 'กำลังอัปโหลด...' : photoUrl ? '✓ แนบรูปหน้างานแล้ว' : '📷 ถ่ายรูปหน้าบ้านเป็นหลักฐาน'}
        </button>

        {!photoUrl && (
          <button
            type="button"
            onClick={() => handleUpload(null)}
            disabled={uploading}
            style={{ minHeight: 38, borderRadius: 10, border: '1px solid #DCE4EC', background: '#F8FAFC', fontSize: 12, cursor: 'pointer' }}
          >
            ใช้รูปจำลองสำหรับทดสอบ (Dev Mode)
          </button>
        )}

        {err && <div style={{ fontSize: 13, color: '#C2255C', fontWeight: 600 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, minHeight: 48, borderRadius: 12, border: '1px solid #DCE4EC', background: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
          >
            กลับ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || uploading}
            style={{ flex: 1, minHeight: 48, borderRadius: 12, border: 'none', background: '#C2255C', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
          >
            {submitting ? 'กำลังส่ง...' : 'ยืนยันส่งไม่สำเร็จ'}
          </button>
        </div>
      </div>
    </div>
  );
};
