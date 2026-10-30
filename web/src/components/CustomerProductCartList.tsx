import React from 'react';
import { formatBaht, Product } from '../api/schemas';
import { resolveProductImageUrl } from '../domain/photo-picker';
import { useI18n } from '../i18n/I18nContext';
import { IconPackage } from './icons/ActionIcons';
import { IconBag, IconDroplet } from './icons/Icons';

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
  const { t } = useI18n();

  return (
    <>
      <div className="dg-card" style={{ overflow: 'hidden' }}>
        {products.map((p, idx) => {
          const qty = cart[p.id] ?? 0;
          const imgUrl = resolveProductImageUrl(p.imageUrl);
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: idx < products.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
              {imgUrl ? (
                <img src={imgUrl} alt={p.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '1px solid #E2E8F0', background: '#F8FAFC' }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 10, background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.isReturnable ? <IconDroplet size={20} /> : <IconPackage size={20} />}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B' }}>
                  <span className="dg-num" style={{ fontWeight: 600, color: '#334155' }}>{formatBaht(p.priceSatang)}</span>
                  {p.isReturnable && (
                    <span style={{ fontSize: 11, background: '#F1F5F9', color: '#475569', padding: '1px 7px', borderRadius: 6, fontWeight: 500 }}>
                      {t('custReturnableTag')}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onChangeCartQty(p.id, Math.max(0, qty - 1))}
                  style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: 18, cursor: 'pointer' }}
                >
                  −
                </button>
                <span className="dg-num" style={{ width: 22, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeCartQty(p.id, qty + 1)}
                  style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: '#0F172A', color: '#FFFFFF', fontSize: 18, cursor: 'pointer' }}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dg-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
            <IconBag size={15} style={{ color: '#475569' }} />
            <span>{t('custReturnBagQuestion')}</span>
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', background: '#F1F5F9', border: '1px solid #E2E8F0', padding: '3px 9px', borderRadius: 99 }}>
            {t('custBagBalanceBadge', { count: bagBalance })}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', flex: 1, background: '#F1F5F9', borderRadius: 10, padding: 3 }}>
            <button
              type="button"
              onClick={() => onToggleReturnBag(false)}
              style={{ flex: 1, minHeight: 34, border: 'none', borderRadius: 8, background: !hasReturnBag ? '#FFFFFF' : 'transparent', color: !hasReturnBag ? '#0F172A' : '#64748B', fontWeight: 600, fontSize: 13, boxShadow: !hasReturnBag ? '0 1px 2px rgba(15,23,42,0.08)' : 'none', cursor: 'pointer' }}
            >
              {t('custNo')}
            </button>
            <button
              type="button"
              onClick={() => onToggleReturnBag(true)}
              style={{ flex: 1, minHeight: 34, border: 'none', borderRadius: 8, background: hasReturnBag ? '#0F172A' : 'transparent', color: hasReturnBag ? '#FFFFFF' : '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              {t('custYes')}
            </button>
          </div>
          {hasReturnBag && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" onClick={() => onChangeReturnBagQty(Math.max(1, returnBagQty - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 16, cursor: 'pointer' }}>−</button>
              <span className="dg-num" style={{ minWidth: 36, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                {returnBagQty} {t('riderStatBagUnit')}
              </span>
              <button type="button" onClick={() => onChangeReturnBagQty(Math.min(bagBalance, returnBagQty + 1))} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 16, cursor: 'pointer' }}>+</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
