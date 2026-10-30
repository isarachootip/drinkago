import React, { useState } from 'react';
import { adminMgmtApi } from '../api/admin-api';
import { IconRefresh } from './icons/ActionIcons';
import { IconLineChat, IconSettings } from './icons/Icons';
import { ProductImageUploader } from './ProductImageUploader';

interface Props {
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onNotify: (msg: string) => void;
}

const RICH_MENU_SLOTS = [
  '1. บนซ้าย (กิจกรรมพบปะ): https://liff.line.me/2012276679-cVW55jug?tab=events',
  '2. บนกลาง (สั่งน้ำดื่ม): Postback/ข้อความ "สั่งน้ำดื่ม" หรือ ?tab=shop',
  '3. บนขวา (ค้นหาตู้เติมน้ำทั่วไทย): https://liff.line.me/2012276679-cVW55jug?tab=stations',
  '4. ล่างซ้าย (ติดตามสถานะ): https://liff.line.me/2012276679-cVW55jug?tab=track',
  '5. ล่างกลาง (เป็นเพื่อนกับเรา): แสดง QR Code สแกนเพิ่มเพื่อน + ปุ่มแชร์ให้เพื่อน',
  '6. ล่างขวา (เยี่ยมชมเรา): เปิดเพจ Facebook & เว็บไซต์ ilife',
];

export const AdminRichMenuBanner: React.FC<Props> = ({ busy, onBusyChange, onNotify }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [richMenuImageUrl, setRichMenuImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSyncRichMenu = async () => {
    onBusyChange(true);
    try {
      const res = await adminMgmtApi.syncLineRichMenu(richMenuImageUrl.trim() || null);
      const srcLabel =
        res.imageSource === 'custom'
          ? 'รูปภาพที่อัปโหลดใหม่'
          : res.imageSource === 'bundled'
            ? 'ภาพมาตรฐาน ilife 6 ช่อง'
            : 'ตาราง 6 ช่องมาตรฐาน';
      onNotify(`ซิงก์ LINE Rich Menu (${res.areas} ปุ่ม · ${srcLabel}) สำเร็จ [${res.mode}: ${res.richMenuId}]`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'ซิงก์ Rich Menu ไม่สำเร็จ');
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <div className="dg-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
            <IconLineChat size={16} style={{ color: '#06C755' }} />
            <span>Product Master &amp; LINE Rich Menu 6 ช่อง (มาตรฐาน ilife)</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
            1. กิจกรรมพบปะ · 2. สั่งน้ำดื่ม · 3. ค้นหาตู้เติมน้ำทั่วไทย · 4. ติดตามสถานะ · 5. เป็นเพื่อนกับเรา · 6. เยี่ยมชมเรา
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="dg-btn-icon"
            style={{ minHeight: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
          >
            <IconSettings size={13} />
            <span>{showConfig ? 'ซ่อนผัง Rich Menu' : 'ดูภาพตัวอย่าง / ตั้งค่ารูป'}</span>
          </button>
          <button
            type="button"
            onClick={handleSyncRichMenu}
            disabled={busy || uploading}
            className="dg-btn-icon"
            style={{ minHeight: 36, padding: '0 14px', borderRadius: 8, border: 'none', background: '#059669', color: '#FFFFFF', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
          >
            <IconRefresh size={13} />
            <span>ซิงก์ LINE Rich Menu 6 ปุ่ม</span>
          </button>
        </div>
      </div>

      {showConfig && (
        <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 12, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <img src="/richmenu-ilife-default.jpg" alt="ilife Rich Menu 6 ปุ่ม" style={{ width: 240, borderRadius: 10, border: '1px solid #E2E8F0', objectFit: 'cover' }} />
            <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>ผังการทำงาน Rich Menu 6 ช่อง:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
                {RICH_MENU_SLOTS.map((slot) => (
                  <div key={slot} style={{ fontSize: 12, background: '#FFFFFF', padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', color: '#334155' }}>
                    {slot}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            หากต้องการเปลี่ยนภาพพื้นหลัง Rich Menu ใหม่ สามารถอัปโหลดด้านล่างแล้วกดซิงก์ (เว้นว่างเพื่อใช้ภาพมาตรฐาน ilife 6 ปุ่ม)
          </div>
          <ProductImageUploader value={richMenuImageUrl} onChange={setRichMenuImageUrl} onNotify={onNotify} onUploadingChange={setUploading} compact />
        </div>
      )}
    </div>
  );
};
