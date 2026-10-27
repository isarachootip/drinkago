import React, { useCallback, useEffect, useState } from 'react';
import { adminMgmtApi } from '../api/admin-api';
import { formatBaht, Product } from '../api/schemas';

interface Props {
  onNotify: (msg: string) => void;
}

export const AdminProductsPanel: React.FC<Props> = ({ onNotify }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [priceBaht, setPriceBaht] = useState('60');
  const [isReturnable, setIsReturnable] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editImage, setEditImage] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      setProducts(await adminMgmtApi.listProducts());
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'โหลดรายการสินค้าไม่สำเร็จ');
    }
  }, [onNotify]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) return onNotify('กรุณากรอกรหัส SKU และชื่อสินค้า');
    setBusy(true);
    try {
      await adminMgmtApi.createProduct({
        sku: sku.trim(),
        name: name.trim(),
        priceSatang: Math.round(Number(priceBaht) * 100),
        isReturnable,
        imageUrl: imageUrl.trim() || null,
      });
      setSku('');
      setName('');
      setImageUrl('');
      onNotify('เพิ่มสินค้าสำหรับ LINE Flex Menu เรียบร้อย');
      await loadProducts();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'เพิ่มสินค้าไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (p: Product) => {
    setBusy(true);
    try {
      await adminMgmtApi.updateProduct(p.id, {
        priceSatang: Math.round(Number(editPrice) * 100),
        imageUrl: editImage.trim() || null,
      });
      setEditingId(null);
      onNotify(`อัปเดตสินค้า ${p.name} เรียบร้อย`);
      await loadProducts();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'อัปเดตสินค้าไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      await adminMgmtApi.updateProduct(p.id, { active: !(p.active ?? true) });
      onNotify(`เปลี่ยนสถานะ ${p.name} เรียบร้อย`);
      await loadProducts();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'เปลี่ยนสถานะไม่สำเร็จ');
    }
  };

  const handleSyncRichMenu = async () => {
    setBusy(true);
    try {
      const res = await adminMgmtApi.syncLineRichMenu();
      onNotify(`ซิงก์ LINE Rich Menu (${res.areas} ปุ่ม) สำเร็จ [${res.mode}: ${res.richMenuId}]`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'ซิงก์ Rich Menu ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: '#E6EEF9', borderRadius: 14, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A56B0' }}>📱 LINE Flex Menu & Rich Menu (Delivery เท่านั้น)</div>
          <div style={{ fontSize: 12, color: '#33475B' }}>ลูกค้าพิมพ์ "เมนู" หรือกดปุ่ม Rich Menu เพื่อเลือกน้ำดื่มใส่ตะกร้าและส่งสลิปในแชท</div>
        </div>
        <button type="button" onClick={handleSyncRichMenu} disabled={busy} style={{ minHeight: 40, padding: '0 14px', borderRadius: 10, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
          🔄 ซิงก์ LINE Rich Menu 4 ปุ่ม
        </button>
      </div>

      <form onSubmit={handleCreate} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>➕ เพิ่มสินค้าใหม่ใน LINE Flex Carousel</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="รหัส SKU (เช่น WATER-PACK-6)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อสินค้า" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input type="number" value={priceBaht} onChange={(e) => setPriceBaht(e.target.value)} placeholder="ราคา (บาท)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={isReturnable} onChange={(e) => setIsReturnable(e.target.checked)} />
            มีถุงหมุนเวียน (รับคืนถุง)
          </label>
        </div>
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="URL รูปภาพสินค้า (HTTPS หรือ /uploads/...)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
        <button type="submit" disabled={busy} style={{ minHeight: 42, borderRadius: 10, border: 'none', background: '#1A56B0', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
          บันทึกสินค้าใหม่
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {products.map((p) => (
          <div key={p.id} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '1px solid #DCE4EC' }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: 10, background: '#E6EEF9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💧</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name} <span style={{ fontSize: 12, color: '#64748B' }}>({p.sku})</span></div>
                <div style={{ fontSize: 13, color: '#1A56B0', fontWeight: 600 }}>
                  {formatBaht(p.priceSatang)} · {p.isReturnable ? '🔄 มีถุงหมุนเวียน' : '📦 ไม่ต้องคืนถุง'}
                </div>
              </div>
              <button type="button" onClick={() => { setEditingId(editingId === p.id ? null : p.id); setEditPrice(String(p.priceSatang / 100)); setEditImage(p.imageUrl ?? ''); }} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #1A56B0', background: '#FFFFFF', color: '#1A56B0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                ✏️ แก้ไขรูป/ราคา
              </button>
              <button type="button" onClick={() => handleToggleActive(p)} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: 'none', background: (p.active ?? true) ? '#E2F8EB' : '#FEE2E2', color: (p.active ?? true) ? '#1E7B45' : '#B91C1C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {(p.active ?? true) ? 'เปิดขาย' : 'ปิดขาย'}
              </button>
            </div>
            {editingId === p.id && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
                <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="ราคา (บาท)" style={{ width: 110, minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
                <input value={editImage} onChange={(e) => setEditImage(e.target.value)} placeholder="URL รูปภาพใหม่" style={{ flex: 1, minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
                <button type="button" onClick={() => handleSaveEdit(p)} style={{ minHeight: 36, padding: '0 14px', borderRadius: 8, border: 'none', background: '#1A56B0', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}>บันทึก</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
