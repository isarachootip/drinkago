import React from 'react';
import { formatBaht, Product } from '../api/schemas';
import { resolveProductImageUrl } from '../domain/photo-picker';

interface Props {
  products: Product[];
  cart: Record<number, number>;
  bagBalance: number;
  hasReturnBag: boolean;
  returnBagQty: number;
  onChangeCartQty: (productId: number, nextQty: number) => void;
  onToggleReturnBag: (enabled: boolean) => void;
  onChangeReturnBagQty: (nextQty: number) => void;
}

export const CustomerProductCartList: React.FC<Props> = ({
  products,
  cart,
  bagBalance,
  hasReturnBag,
  returnBagQty,
  onChangeCartQty,
  onToggleReturnBag,
  onChangeReturnBagQty,
}) => {
  return (
    <>
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', overflow: 'hidden' }}>
        {products.map((p, idx) => {
          const qty = cart[p.id] ?? 0;
          const imgUrl = resolveProductImageUrl(p.imageUrl);
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderBottom: idx < products.length - 1 ? '1px solid #DCE4EC' : 'none' }}>
              {imgUrl ? (
                <img src={imgUrl} alt={p.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '1px solid #DCE4EC', background: '#F8FAFC' }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 10, background: '#E6EEF9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{p.isReturnable ? '🛢️' : '📦'}</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: '#4A5B6E' }}>{formatBaht(p.priceSatang)} {p.isReturnable ? '(มีถุงหมุนเวียน)' : ''}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button type="button" onClick={() => onChangeCartQty(p.id, Math.max(0, qty - 1))} style={{ width: 38, height: 38, borderRadius: 19, border: '1px solid #DCE4EC', background: '#FFFFFF', fontSize: 18, cursor: 'pointer' }}>−</button>
                <span style={{ width: 22, textAlign: 'center', fontSize: 16, fontWeight: 700 }}>{qty}</span>
                <button type="button" onClick={() => onChangeCartQty(p.id, qty + 1)} style={{ width: 38, height: 38, borderRadius: 19, border: 'none', background: '#1A56B0', color: '#FFFFFF', fontSize: 18, cursor: 'pointer' }}>+</button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', background: '#FFFFFF', borderRadius: 14, border: '1px solid #F3C4D4' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>มีถุงคืนรอบนี้ไหม?</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#C2255C', background: '#FCE8EF', padding: '3px 10px', borderRadius: 10 }}>ถุงค้างของคุณ {bagBalance} ใบ</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', flex: 1, background: '#F3F7FA', borderRadius: 12, padding: 3 }}>
            <button type="button" onClick={() => onToggleReturnBag(false)} style={{ flex: 1, minHeight: 38, border: 'none', borderRadius: 10, background: !hasReturnBag ? '#0F2236' : 'transparent', color: !hasReturnBag ? '#FFFFFF' : '#4A5B6E', fontWeight: 600, cursor: 'pointer' }}>ไม่มี</button>
            <button type="button" onClick={() => onToggleReturnBag(true)} style={{ flex: 1, minHeight: 38, border: 'none', borderRadius: 10, background: hasReturnBag ? '#C2255C' : 'transparent', color: hasReturnBag ? '#FFFFFF' : '#4A5B6E', fontWeight: 600, cursor: 'pointer' }}>มี</button>
          </div>
          {hasReturnBag && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button type="button" onClick={() => onChangeReturnBagQty(Math.max(1, returnBagQty - 1))} style={{ width: 36, height: 36, borderRadius: 18, border: '1px solid #DCE4EC', background: '#FFFFFF', fontSize: 18, cursor: 'pointer' }}>−</button>
              <span style={{ width: 42, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{returnBagQty} ใบ</span>
              <button type="button" onClick={() => onChangeReturnBagQty(Math.min(bagBalance, returnBagQty + 1))} style={{ width: 36, height: 36, borderRadius: 18, border: '1px solid #DCE4EC', background: '#FFFFFF', fontSize: 18, cursor: 'pointer' }}>+</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
