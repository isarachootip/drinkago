import React, { useRef, useState } from 'react';
import { DevAuthSettings, EvidenceInput, OrderDetail, RiderJob } from '../api/schemas';
import { OtpBagSection } from '../components/OtpBagSection';
import { distanceMeters, formatDistance, getCurrentGps } from '../domain/geo';
import { uploadSelectedOrDemoPhoto } from '../domain/photo-picker';

interface Props {
  job: RiderJob;
  detail: OrderDetail | null;
  settings: DevAuthSettings;
  onBack: () => void;
  onDeliver: (payload: { evidence: EvidenceInput; otp?: string; bagsCollected: number; bagPhotoUrl?: string }) => Promise<void>;
  onOpenFailModal: () => void;
}

export const RiderPodPage: React.FC<Props> = ({ job, detail, settings, onBack, onDeliver, onOpenFailModal }) => {
  const podFileRef = useRef<HTMLInputElement | null>(null);
  const [digits, setDigits] = useState<[string, string, string, string]>(['', '', '', '']);
  const [bagsCollected, setBagsCollected] = useState<number>(job.expectBagReturn);
  const [podPhotoUrl, setPodPhotoUrl] = useState<string>('');
  const [bagPhotoUrl, setBagPhotoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const distMeters = distanceMeters(settings.mockLat, settings.mockLng, job.address.lat, job.address.lng);
  const itemsText = detail?.items.map((i) => `${i.name} × ${i.qty}`).join(', ') ?? '';

  const handleDigitChange = (idx: number, val: string) => {
    const next = [...digits] as [string, string, string, string];
    next[idx] = val;
    setDigits(next);
  };

  const handleUploadPod = async (file?: File | null) => {
    setUploading(true);
    setErr(null);
    try {
      setPodPhotoUrl(await uploadSelectedOrDemoPhoto(file, `pod-${job.code}.png`));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'อัปโหลดรูปส่งสินค้าไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadBag = async (file?: File | null) => {
    setUploading(true);
    setErr(null);
    try {
      setBagPhotoUrl(await uploadSelectedOrDemoPhoto(file, `bags-${job.code}.png`));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'อัปโหลดรูปถุงคืนไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!podPhotoUrl) {
      setErr('กรุณาถ่ายรูปหลักฐานการส่งสินค้า (ข้อ 1)');
      return;
    }
    const otp = digits.join('');
    if (otp.length !== 4) {
      setErr('กรุณากรอกรหัสยืนยัน 4 หลักจากลูกค้าให้ครบ (ข้อ 2)');
      return;
    }
    if (bagsCollected > 0 && !bagPhotoUrl) {
      setErr('มีการรับถุงคืน กรุณาถ่ายรูปถุงที่รับคืนเป็นหลักฐาน (ข้อ 3)');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const gps = await getCurrentGps(settings);
      await onDeliver({
        evidence: { photoUrl: podPhotoUrl, lat: gps.lat, lng: gps.lng },
        otp,
        bagsCollected,
        ...(bagsCollected > 0 ? { bagPhotoUrl } : {}),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ยืนยันการจัดส่งไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#FFFFFF', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #DCE4EC' }}>
        <button type="button" onClick={onBack} aria-label="กลับไปงานวันนี้" style={{ width: 44, height: 44, borderRadius: 22, border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer' }}>
          ←
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>ยืนยันส่งสำเร็จ</span>
          <span style={{ fontSize: 13, color: '#4A5B6E' }}>
            #{job.code} · {job.customerName} {itemsText ? `· ${itemsText}` : ''}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>1. รูปถ่ายหลักฐานการส่ง</span>
            <span style={{ fontSize: 12, color: '#C2255C', fontWeight: 600 }}>จำเป็น</span>
          </div>
          <input ref={podFileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" style={{ display: 'none' }} onChange={(e) => handleUploadPod(e.target.files?.[0])} />
          <button
            type="button"
            onClick={() => podFileRef.current?.click()}
            disabled={uploading}
            style={{ height: 112, border: '2px dashed #9AABBD', borderRadius: 12, background: podPhotoUrl ? '#E3F3E9' : '#F3F7FA', color: podPhotoUrl ? '#17613A' : '#1A56B0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            {podPhotoUrl ? '✓ แนบรูปส่งสินค้าแล้ว (แตะเพื่อถ่ายใหม่)' : '📷 ถ่ายรูปสินค้าที่ส่งถึงมือลูกค้า'}
          </button>
          {!podPhotoUrl && (
            <button type="button" onClick={() => handleUploadPod(null)} disabled={uploading} style={{ minHeight: 36, borderRadius: 8, border: '1px solid #DCE4EC', background: '#F8FAFC', fontSize: 12, cursor: 'pointer' }}>
              ใช้รูปจำลองส่งสินค้า (Dev Mode)
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#17613A', background: '#E3F3E9', padding: '8px 12px', borderRadius: 10 }}>
            <span>✓</span>
            <span style={{ flex: 1 }}>พิกัด GPS พร้อมส่ง · ห่างจุดส่ง {formatDistance(distMeters)}</span>
          </div>
        </div>

        <OtpBagSection
          digits={digits}
          onDigitChange={handleDigitChange}
          expectedBags={job.expectBagReturn}
          bagsCollected={bagsCollected}
          onChangeBags={setBagsCollected}
          bagPhotoUrl={bagPhotoUrl}
          uploading={uploading}
          onUploadBag={handleUploadBag}
        />

        {err && <div style={{ background: '#FCE8EF', color: '#9B1B49', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{err}</div>}
      </div>

      <div style={{ background: '#FFFFFF', borderTop: '1px solid #DCE4EC', padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" onClick={handleSubmit} disabled={submitting || uploading} style={{ width: '100%', minHeight: 54, border: 'none', borderRadius: 14, background: '#1E7B45', color: '#FFFFFF', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
          {submitting ? 'กำลังบันทึก...' : bagsCollected > 0 ? `ยืนยันส่งสำเร็จ และรับถุง ${bagsCollected} ใบ` : 'ยืนยันส่งสำเร็จ (ไม่มีถุงคืน)'}
        </button>
        <button type="button" onClick={onOpenFailModal} style={{ width: '100%', minHeight: 44, border: 'none', background: 'transparent', color: '#4A5B6E', fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}>
          ส่งไม่สำเร็จ แจ้งเหตุผล
        </button>
      </div>
    </div>
  );
};
