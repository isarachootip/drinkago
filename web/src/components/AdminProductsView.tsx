import React from 'react';
import { formatBaht, Product } from '../api/schemas';
import { resolveProductImageUrl } from '../domain/photo-picker';
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
  if (viewMode === 'grid') {
    return (
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 740 }}>
          <thead>
            <tr style={{ background: '#F1F5F9', color: '#0F2236', textAlign: 'left', borderBottom: '1px solid #DCE4EC' }}>
              <th style={{ padding: '10px 12px', fontWeight: 700, width: 64 }}>รูปภาพ</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>รหัส SKU</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>ชื่อสินค้า</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>ราคา</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>ถุงหมุนเวียน</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>สถานะ</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const thumbUrl = resolveProductImageUrl(p.imageUrl);
              const isActive = p.active ?? true;
              return (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: '1px solid #EEF2F6',
                    background: editingId === p.id ? '#F0F9FF' : '#FFFFFF',
                  }}
                >
                  <td style={{ padding: '8px 12px' }}>
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={p.name} style={{ width: 46, height: 46, borderRadius: 10, objectFit: 'cover', border: '1px solid #DCE4EC', background: '#F8FAFC' }} />
                    ) : (
                      <div style={{ width: 46, height: 46, borderRadius: 10, background: '#E6EEF9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        {p.isReturnable ? '🛢️' : '📦'}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#4A5B6E', whiteSpace: 'nowrap' }}>{p.sku}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F2236' }}>{p.name}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#1A56B0', whiteSpace: 'nowrap' }}>
                    {formatBaht(p.priceSatang)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 12, color: p.isReturnable ? '#0B6E8A' : '#64748B', fontWeight: 600 }}>
                      {p.isReturnable ? '🔄 รับคืนถุง' : '📦 ไม่คืนถุง'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => onToggleActive(p)}
                      style={{ minHeight: 28, padding: '0 10px', borderRadius: 8, border: 'none', background: isActive ? '#E2F8EB' : '#FEE2E2', color: isActive ? '#1E7B45' : '#B91C1C', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {isActive ? '● เปิดขาย' : '○ ปิดขาย'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button type="button" onClick={() => onOpenEdit(p)} style={{ minHeight: 30, padding: '0 10px', borderRadius: 8, border: '1px solid #1A56B0', background: editingId === p.id ? '#1A56B0' : '#FFFFFF', color: editingId === p.id ? '#FFFFFF' : '#1A56B0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        ✏️ แก้ไข
                      </button>
                      <button type="button" onClick={() => onDelete(p)} disabled={busy} style={{ minHeight: 30, padding: '0 10px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        🗑️ ลบ
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
        const thumbUrl = resolveProductImageUrl(p.imageUrl);
        const isActive = p.active ?? true;
        return (
          <div
            key={p.id}
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              border: editingId === p.id ? '2px solid #1A56B0' : '1px solid #DCE4EC',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 10,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {thumbUrl ? (
                <img src={thumbUrl} alt={p.name} style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '1px solid #DCE4EC', background: '#F8FAFC', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 12, background: '#E6EEF9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#64748B', flexShrink: 0 }}>
                  <span>{p.isReturnable ? '🛢️' : '📦'}</span>
                  <span style={{ fontSize: 9 }}>No Img</span>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2236' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>SKU: {p.sku}</div>
                <div style={{ fontSize: 14, color: '#1A56B0', fontWeight: 800, marginTop: 2 }}>
                  {formatBaht(p.priceSatang)} · <span style={{ fontSize: 12, fontWeight: 600 }}>{p.isReturnable ? '🔄 รับคืนถุง' : '📦 ไม่คืนถุง'}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, paddingTop: 8, borderTop: '1px solid #EEF2F6' }}>
              <button type="button" onClick={() => onOpenEdit(p)} style={{ minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #1A56B0', background: editingId === p.id ? '#1A56B0' : '#FFFFFF', color: editingId === p.id ? '#FFFFFF' : '#1A56B0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                ✏️ {editingId === p.id ? 'ปิดแก้ไข' : 'แก้ไข'}
              </button>
              <button type="button" onClick={() => onToggleActive(p)} style={{ minHeight: 34, padding: '0 8px', borderRadius: 8, border: 'none', background: isActive ? '#E2F8EB' : '#FEE2E2', color: isActive ? '#1E7B45' : '#B91C1C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {isActive ? '● เปิดขาย' : '○ ปิดขาย'}
              </button>
              <button type="button" onClick={() => onDelete(p)} disabled={busy} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                🗑️ ลบ
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
