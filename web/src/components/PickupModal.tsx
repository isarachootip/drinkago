import React, { useRef, useState } from 'react';
import { DevAuthSettings, EvidenceInput, RiderJob } from '../api/schemas';
import { getCurrentGps } from '../domain/geo';
import { uploadSelectedOrDemoPhoto } from '../domain/photo-picker';

interface Props {
  job: RiderJob;
  settings: DevAuthSettings;
  onConfirm: (evidence: EvidenceInput) => Promise<void>;
  onClose: () => void;
}

export const PickupModal: React.FC<Props> = ({ job, settings, onConfirm, onClose }) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleUpload = async (file?: File | null) => {
    setUploading(true);
    setErr(null);
    try {
      const url = await uploadSelectedOrDemoPhoto(file, `pickup-${job.code}.png`);
      setPhotoUrl(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!photoUrl) {
      setErr('กรุณาถ่ายหรือแนบรูปสินค้าก่อนยืนยันการรับสินค้า');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const gps = await getCurrentGps(settings);
      await onConfirm({ photoUrl, lat: gps.lat, lng: gps.lng });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ยืนยันการรับสินค้าไม่สำเร็จ');
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
        <div style={{ fontSize: 17, fontWeight: 700 }}>ขั้นที่ 4: ยืนยันการรับสินค้า</div>
        <div style={{ fontSize: 13, color: '#4A5B6E' }}>
          #{job.code} · {job.customerName}
        </div>

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
            minHeight: 96,
            border: '2px dashed #9AABBD',
            borderRadius: 12,
            background: photoUrl ? '#E3F3E9' : '#F3F7FA',
            color: photoUrl ? '#17613A' : '#1A56B0',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {uploading ? 'กำลังอัปโหลดรูป...' : photoUrl ? '✓ แนบรูปรับสินค้าแล้ว (แตะเพื่อเปลี่ยน)' : '📷 ถ่ายรูปสินค้าที่รับขึ้นรถ'}
        </button>

        {!photoUrl && (
          <button
            type="button"
            onClick={() => handleUpload(null)}
            disabled={uploading}
            style={{
              minHeight: 40,
              borderRadius: 10,
              border: '1px solid #DCE4EC',
              background: '#F8FAFC',
              color: '#33475B',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            ใช้รูปจำลองสำหรับทดสอบ (Dev Mode)
          </button>
        )}

        {err && <div style={{ fontSize: 13, color: '#C2255C', fontWeight: 600 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, minHeight: 48, borderRadius: 12, border: '1px solid #DCE4EC', background: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || uploading}
            style={{ flex: 1, minHeight: 48, borderRadius: 12, border: 'none', background: '#1A56B0', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
          >
            {submitting ? 'กำลังบันทึก...' : 'ยืนยันรับสินค้า'}
          </button>
        </div>
      </div>
    </div>
  );
};
