import React, { useCallback, useEffect, useState } from 'react';
import { adminMgmtApi } from '../api/admin-api';
import { Product } from '../api/schemas';
import { AdminProductsView } from './AdminProductsView';
import { ProductImageUploader } from './ProductImageUploader';
import { AdminViewMode, getSavedViewMode, ViewModeToggle } from './ViewModeToggle';

interface Props {
  onNotify: (msg: string) => void;
  viewMode?: AdminViewMode;
  onViewModeChange?: (mode: AdminViewMode) => void;
}

export const AdminProductsPanel: React.FC<Props> = ({ onNotify, viewMode: propMode, onViewModeChange }) => {
  const [localMode, setLocalMode] = useState<AdminViewMode>(() => getSavedViewMode());
  const viewMode = propMode ?? localMode;
  const handleModeChange = (m: AdminViewMode) => {
    setLocalMode(m);
    onViewModeChange?.(m);
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [priceBaht, setPriceBaht] = useState('60');
  const [isReturnable, setIsReturnable] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSku, setEditSku] = useState('');
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editReturnable, setEditReturnable] = useState(true);
  const [editImage, setEditImage] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

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
        sku: sku.trim(), name: name.trim(), priceSatang: Math.round(Number(priceBaht) * 100),
        isReturnable, imageUrl: imageUrl.trim() || null,
      });
      setSku(''); setName(''); setImageUrl('');
      onNotify('เพิ่มสินค้าใหม่ใน Product Master & LINE Flex Menu เรียบร้อย');
      await loadProducts();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'เพิ่มสินค้าไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (p: Product) => {
    if (editingId === p.id) return setEditingId(null);
    setEditingId(p.id);
    setEditSku(p.sku); setEditName(p.name); setEditPrice(String(p.priceSatang / 100));
    setEditReturnable(p.isReturnable); setEditImage(p.imageUrl ?? ''); setEditActive(p.active ?? true);
  };

  const handleSaveEdit = async (p: Product) => {
    if (!editSku.trim() || !editName.trim()) return onNotify('รหัส SKU และชื่อสินค้าห้ามว่าง');
    setBusy(true);
    try {
      await adminMgmtApi.updateProduct(p.id, {
        sku: editSku.trim(), name: editName.trim(), priceSatang: Math.round(Number(editPrice) * 100),
        isReturnable: editReturnable, imageUrl: editImage.trim() || null, active: editActive,
      });
      setEditingId(null);
      onNotify(`อัปเดตข้อมูลและรูปสินค้า ${editName.trim()} เรียบร้อย`);
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
      onNotify(`เปลี่ยนสถานะการขาย ${p.name} เรียบร้อย`);
      await loadProducts();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'เปลี่ยนสถานะไม่สำเร็จ');
    }
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`ยืนยันการลบสินค้า "${p.name}" (${p.sku})?`)) return;
    setBusy(true);
    try {
      const res = await adminMgmtApi.deleteProduct(p.id);
      onNotify(res.mode === 'HARD_DELETE' ? `🗑️ ลบสินค้า ${p.name} ถาวรเรียบร้อย` : `📦 สินค้า ${p.name} มีประวัติสั่งซื้อ ระบบจึงซ่อนจากการขาย (Soft Delete)`);
      if (editingId === p.id) setEditingId(null);
      await loadProducts();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'ลบสินค้าไม่สำเร็จ');
    } finally {
      setBusy(false);
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

  const editingProduct = products.find((p) => p.id === editingId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: '#E6EEF9', borderRadius: 14, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A56B0' }}>📱 Product Master &amp; LINE Flex Menu (สไตล์ ODM)</div>
          <div style={{ fontSize: 12, color: '#33475B' }}>จัดการรูปภาพสินค้า (จำกัด 2 MB) แสดงผลทั้งหน้าเว็บลูกค้าและ LINE Flex Carousel</div>
        </div>
        <button type="button" onClick={handleSyncRichMenu} disabled={busy} style={{ minHeight: 40, padding: '0 14px', borderRadius: 10, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
          🔄 ซิงก์ LINE Rich Menu 4 ปุ่ม
        </button>
      </div>

      <form onSubmit={handleCreate} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>➕ เพิ่มสินค้าใหม่ (New Product Master)</div>
        <ProductImageUploader value={imageUrl} onChange={setImageUrl} onNotify={onNotify} onUploadingChange={setUploadingImg} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="รหัส SKU (เช่น WATER-PACK-6)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อสินค้า" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input type="number" value={priceBaht} onChange={(e) => setPriceBaht(e.target.value)} placeholder="ราคา (บาท)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={isReturnable} onChange={(e) => setIsReturnable(e.target.checked)} /> มีถุงหมุนเวียน (รับคืนถุง)
          </label>
        </div>
        <button type="submit" disabled={busy || uploadingImg} style={{ minHeight: 42, borderRadius: 10, border: 'none', background: '#1A56B0', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer', opacity: busy || uploadingImg ? 0.6 : 1 }}>
          {uploadingImg ? 'กำลังอัปโหลดรูปภาพ...' : 'บันทึกสินค้าใหม่'}
        </button>
      </form>

      <ViewModeToggle mode={viewMode} onChange={handleModeChange} title="รายการสินค้าทั้งหมด" count={products.length} />

      {editingProduct && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '2px solid #1A56B0', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1A56B0' }}>✏️ แก้ไขข้อมูลและรูปภาพสินค้า: {editingProduct.name}</span>
            <button type="button" onClick={() => setEditingId(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>✕ ปิด</button>
          </div>
          <ProductImageUploader value={editImage} onChange={setEditImage} onNotify={onNotify} onUploadingChange={setUploadingImg} compact />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px', gap: 8 }}>
            <input value={editSku} onChange={(e) => setEditSku(e.target.value)} placeholder="รหัส SKU" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="ชื่อสินค้า" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
            <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="ราคา (บาท)" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}><input type="checkbox" checked={editReturnable} onChange={(e) => setEditReturnable(e.target.checked)} /> มีถุงหมุนเวียน</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}><input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} /> แสดงในเมนูขาย (Show on Sale)</label>
            </div>
            <button type="button" onClick={() => handleSaveEdit(editingProduct)} disabled={busy || uploadingImg} style={{ minHeight: 36, padding: '0 16px', borderRadius: 8, border: 'none', background: '#1A56B0', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>💾 บันทึกการแก้ไข</button>
          </div>
        </div>
      )}

      <AdminProductsView
        products={products}
        viewMode={viewMode}
        editingId={editingId}
        busy={busy}
        onOpenEdit={openEdit}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
      />
    </div>
  );
};
