import React, { useState } from 'react';
import { formatBaht, Product } from '../api/schemas';
import { resolveProductImageUrl } from '../domain/photo-picker';
import { IconEdit, IconPackage, IconTrash } from './icons/ActionIcons';
import { IconDroplet } from './icons/Icons';
import { AdminViewMode } from './ViewModeToggle';

interface Props {
  products: Product[];
  viewMode: AdminViewMode;
  editingId: number | null;
  busy: boolean;
  onOpenEdit: (p: Product) => void;
  onToggleActive: (p: Product) => void;
  onDelete: (p: Product) => void;
}

export const AdminProductsView: React.FC<Props> = ({
  products,
  viewMode,
  editingId,
  busy,
  onOpenEdit,
  onToggleActive,
  onDelete,
}) => {
  const [brokenUrls, setBrokenUrls] = useState<Record<string, boolean>>({});

  if (viewMode === 'grid') {
    return (
      <div className="dg-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 740 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', color: '#475569', textAlign: 'left', borderBottom: '1px solid #E2E8F0', fontSize: 12 }}>
              <th style={{ padding: '10px 12px', fontWeight: 600, width: 64 }}>รูปภาพ</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>รหัส SKU</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>ชื่อสินค้า</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>ราคา</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>ถุงหมุนเวียน</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>สถานะ</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const rawThumb = resolveProductImageUrl(p.imageUrl);
              const thumbUrl = rawThumb && !brokenUrls[rawThumb] ? rawThumb : null;
              const isActive = p.active ?? true;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9', background: editingId === p.id ? '#EFF6FF' : '#FFFFFF' }}>
                  <td style={{ padding: '8px 12px' }}>
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={p.name} onError={() => setBrokenUrls((prev) => ({ ...prev, [thumbUrl]: true }))} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid #E2E8F0', background: '#F8FAFC' }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.isReturnable ? <IconDroplet size={18} /> : <IconPackage size={18} />}
                      </div>
                    )}
                  </td>
                  <td className="dg-num" style={{ padding: '10px 12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{p.sku}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>{p.name}</td>
                  <td className="dg-num" style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                    {formatBaht(p.priceSatang)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 11, color: p.isReturnable ? '#0369A1' : '#64748B', background: p.isReturnable ? '#F0F9FF' : '#F1F5F9', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
                      {p.isReturnable ? 'รับคืนถุง' : 'ไม่คืนถุง'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => onToggleActive(p)} style={{ minHeight: 26, padding: '0 10px', borderRadius: 99, border: 'none', background: isActive ? '#ECFDF5' : '#FEF2F2', color: isActive ? '#047857' : '#B91C1C', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      {isActive ? 'เปิดขาย' : 'ปิดขาย'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button type="button" onClick={() => onOpenEdit(p)} className="dg-btn-icon" style={{ minHeight: 30, padding: '0 10px', borderRadius: 7, border: '1px solid #CBD5E1', background: editingId === p.id ? '#0F172A' : '#FFFFFF', color: editingId === p.id ? '#FFFFFF' : '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <IconEdit size={12} />
                        <span>แก้ไข</span>
                      </button>
                      <button type="button" onClick={() => onDelete(p)} disabled={busy} className="dg-btn-icon" style={{ minHeight: 30, padding: '0 10px', borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <IconTrash size={12} />
                        <span>ลบ</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 12 }}>
      {products.map((p) => {
        const rawThumb = resolveProductImageUrl(p.imageUrl);
        const thumbUrl = rawThumb && !brokenUrls[rawThumb] ? rawThumb : null;
        const isActive = p.active ?? true;
        return (
          <div key={p.id} className="dg-card" style={{ border: editingId === p.id ? '1.5px solid #1D4ED8' : '1px solid #E2E8F0', padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {thumbUrl ? (
                <img src={thumbUrl} alt={p.name} onError={() => setBrokenUrls((prev) => ({ ...prev, [thumbUrl]: true }))} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', border: '1px solid #E2E8F0', background: '#F8FAFC', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 60, height: 60, borderRadius: 10, background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748B', flexShrink: 0, gap: 2 }}>
                  {p.isReturnable ? <IconDroplet size={20} /> : <IconPackage size={20} />}
                  <span style={{ fontSize: 9 }}>No Img</span>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{p.name}</div>
                <div className="dg-num" style={{ fontSize: 12, color: '#64748B' }}>SKU: {p.sku}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <span className="dg-num" style={{ fontSize: 14, color: '#0F172A', fontWeight: 700 }}>{formatBaht(p.priceSatang)}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#475569', background: '#F1F5F9', padding: '1px 7px', borderRadius: 6 }}>
                    {p.isReturnable ? 'รับคืนถุง' : 'ไม่คืนถุง'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
              <button type="button" onClick={() => onOpenEdit(p)} className="dg-btn-icon" style={{ minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1', background: editingId === p.id ? '#0F172A' : '#FFFFFF', color: editingId === p.id ? '#FFFFFF' : '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <IconEdit size={13} />
                <span>{editingId === p.id ? 'ปิดแก้ไข' : 'แก้ไข'}</span>
              </button>
              <button type="button" onClick={() => onToggleActive(p)} style={{ minHeight: 34, padding: '0 8px', borderRadius: 8, border: 'none', background: isActive ? '#ECFDF5' : '#FEF2F2', color: isActive ? '#047857' : '#B91C1C', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {isActive ? 'เปิดขาย' : 'ปิดขาย'}
              </button>
              <button type="button" onClick={() => onDelete(p)} disabled={busy} className="dg-btn-icon" style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <IconTrash size={13} />
                <span>ลบ</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
