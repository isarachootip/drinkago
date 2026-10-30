import React, { useCallback, useEffect, useState } from 'react';
import { customerApi } from '../api/role-api';
import { BagSummary, CustomerAddress, formatBaht, Product, StaffOrder, SuggestedStation } from '../api/schemas';
import { CustomerAddressCard } from '../components/CustomerAddressCard';
import { CustomerProductCartList } from '../components/CustomerProductCartList';
import { IconCheck, IconPackage } from '../components/icons/ActionIcons';
import { IconCalendar, IconDroplet, IconMapPin } from '../components/icons/Icons';
import { LineBanner } from '../components/LineBanner';
import { PromptPayQrCard } from '../components/PromptPayQrCard';
import { pickPreferredAddress } from '../domain/navigation';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  customerUser: string;
  onOrderCreated: (orderId: string) => void;
  onGoTrack: () => void;
  onGoStations?: () => void;
  onGoEvents?: () => void;
  onNotify: (msg: string) => void;
}

export const CustomerOrderPage: React.FC<Props> = ({ customerUser, onOrderCreated, onGoTrack, onGoStations, onGoEvents, onNotify }) => {
  const { t } = useI18n();
  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const [needsRegister, setNeedsRegister] = useState(false);
  const [regName, setRegName] = useState('คุณสมใจ');
  const [regPhone, setRegPhone] = useState('0812345678');
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string>('');
  const [suggestedStations, setSuggestedStations] = useState<SuggestedStation[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [bags, setBags] = useState<BagSummary>({ balance: 0, history: [] });
  const [hasReturnBag, setHasReturnBag] = useState(false);
  const [returnBagQty, setReturnBagQty] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'PROMPTPAY' | 'CREDIT'>('CASH');
  const [creditLimitSatang, setCreditLimitSatang] = useState<number>(100000);
  const [lastOrder, setLastOrder] = useState<StaffOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const me = await customerApi.getMe(customerUser);
      setRegisteredName(me.name); setCreditLimitSatang(me.creditLimitSatang ?? 100000); setNeedsRegister(false);
      const [addrs, prods, bagSum, mine] = await Promise.all([
        customerApi.listAddresses(customerUser), customerApi.listProducts(customerUser),
        customerApi.getBags(customerUser), customerApi.myOrders(customerUser),
      ]);
      const finalAddrs = addrs.length ? addrs : [await customerApi.addAddress({ label: 'บ้าน', detail: 'สุขุมวิท 50 แขวงพระโขนง', lat: 13.7058, lng: 100.6012, note: 'ทางเข้าประตูหลัง' }, customerUser)];
      setAddresses(finalAddrs);
      const targetAddr = pickPreferredAddress(finalAddrs);
      setSelectedAddrId((cur) => (finalAddrs.some((a) => a.id === cur) ? cur : (targetAddr?.id ?? '')));
      if (targetAddr) {
        const stList = await customerApi.suggestStations(targetAddr.lat, targetAddr.lng, customerUser).catch(() => []);
        setSuggestedStations(stList); setSelectedStationId((cur) => cur ?? stList[0]?.id);
      }
      setProducts(prods);
      if (prods.length > 0) setCart((prev) => (Object.keys(prev).length ? prev : { [prods[0].id]: 3 }));
      setBags(bagSum); setReturnBagQty(Math.min(bagSum.balance, 2)); setHasReturnBag(bagSum.balance > 0);
      setLastOrder(mine[0] ?? null);
    } catch { setNeedsRegister(true); }
  }, [customerUser]);
  useEffect(() => { void loadData(); }, [loadData]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await customerApi.register({ name: regName.trim(), phone: regPhone.trim() }, customerUser);
      onNotify('ลงทะเบียนและยอมรับ PDPA เรียบร้อย'); await loadData();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'ลงทะเบียนไม่สำเร็จ'); }
    finally { setSubmitting(false); }
  };
  const totalSatang = products.reduce((sum, p) => sum + (cart[p.id] ?? 0) * p.priceSatang, 0);

  const handlePlaceOrder = async () => {
    const items = Object.entries(cart).map(([id, qty]) => ({ productId: Number(id), qty })).filter((i) => i.qty > 0);
    if (items.length === 0) return onNotify('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');
    setSubmitting(true);
    try {
      const order = await customerApi.createOrder({ addressId: selectedAddrId, stationId: selectedStationId, items, expectBagReturn: hasReturnBag ? returnBagQty : 0, paymentMethod, autoConfirm: true }, customerUser);
      onNotify(`สั่งซื้อสำเร็จ #${order.code}`); onOrderCreated(order.id);
    } catch (err) { onNotify(err instanceof Error ? err.message : 'สั่งซื้อไม่สำเร็จ'); }
    finally { setSubmitting(false); }
  };

  const handleReorder = async () => {
    setSubmitting(true);
    try {
      const order = await customerApi.reorder({ expectBagReturn: hasReturnBag ? returnBagQty : 0, addressId: selectedAddrId, stationId: selectedStationId }, customerUser);
      onNotify(`สั่งซ้ำสำเร็จ #${order.code}`); onOrderCreated(order.id);
    } catch (err) { onNotify(err instanceof Error ? err.message : 'สั่งซ้ำไม่สำเร็จ'); }
    finally { setSubmitting(false); }
  };

  if (needsRegister) {
    return (
      <form onSubmit={handleRegister} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <LineBanner customerUser={customerUser} />
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{t('custRegTitle')}</div>
        <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder={t('custRegNamePlaceholder')} style={{ minHeight: 42, padding: '0 12px', borderRadius: 10, border: '1px solid #CBD5E1' }} />
        <input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder={t('custRegPhonePlaceholder')} style={{ minHeight: 42, padding: '0 12px', borderRadius: 10, border: '1px solid #CBD5E1' }} />
        <button type="submit" disabled={submitting} style={{ minHeight: 46, borderRadius: 10, border: 'none', background: '#0F172A', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}>{t('custRegSubmitBtn')}</button>
      </form>
    );
  }
  const activeAddr = pickPreferredAddress(addresses, selectedAddrId) ?? undefined;
  const refreshSuggestedForAddr = async (addr: CustomerAddress) => {
    const stList = await customerApi.suggestStations(addr.lat, addr.lng, customerUser).catch(() => []);
    setSuggestedStations(stList); if (stList[0]) setSelectedStationId(stList[0].id);
  };
  const handleSelectAddress = async (addrId: string) => {
    setSelectedAddrId(addrId);
    const found = addresses.find((a) => a.id === addrId);
    if (found) await refreshSuggestedForAddr(found);
  };
  const handleSaveNewAddress = async (input: { label: string; detail: string; lat: number; lng: number; note?: string }) => {
    const saved = await customerApi.addAddress(input, customerUser);
    setAddresses((prev) => [...prev, saved]);
    if (saved.id) setSelectedAddrId(saved.id);
    await refreshSuggestedForAddr(saved);
    onNotify('บันทึกที่อยู่จัดส่งและอัปเดตตู้กดน้ำใกล้บ้านเรียบร้อย');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#FFFFFF', padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
            <IconDroplet size={18} style={{ color: '#1D4ED8' }} />
            <span>{t('appBrand')}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {onGoEvents && <button type="button" onClick={onGoEvents} className="dg-btn-icon" style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><IconCalendar size={13} /><span>{t('custNavEvents')}</span></button>}
            {onGoStations && <button type="button" onClick={onGoStations} className="dg-btn-icon" style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><IconMapPin size={13} /><span>{t('custNavStations')}</span></button>}
            <button type="button" onClick={onGoTrack} className="dg-btn-icon" style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #0F172A', background: '#0F172A', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><IconPackage size={13} /><span>{t('custNavTrack')}{registeredName ? ` (${registeredName})` : ''}</span></button>
          </div>
        </div>
        <LineBanner customerUser={customerUser} />
        <CustomerAddressCard addresses={addresses} activeAddr={activeAddr} onSelectAddress={(id) => void handleSelectAddress(id)} onSaveNewAddress={handleSaveNewAddress} onNotify={onNotify} />
        {suggestedStations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 12, background: '#F8FAFC' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
              <IconDroplet size={14} style={{ color: '#0369A1' }} />
              <span>{t('custNearestStationTitle', { code: suggestedStations[0].code, km: suggestedStations[0].distanceKm })}</span>
            </div>
            <select value={selectedStationId ?? suggestedStations[0].id} onChange={(e) => setSelectedStationId(Number(e.target.value))} style={{ minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, fontWeight: 500, background: '#FFFFFF', color: '#0F172A' }}>
              {suggestedStations.map((st, i) => (
                <option key={st.id} value={st.id}>{i === 0 ? t('custRecommendedPrefix') : ''}{st.code} · {st.name} ({st.distanceKm} km)</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {lastOrder && (
          <div className="dg-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
            <div style={{ flex: 1, fontSize: 13, color: '#334155' }}>
              <strong style={{ color: '#0F172A' }}>{t('custLastOrderLabel', { code: lastOrder.code })}</strong> · <span className="dg-num">{formatBaht(lastOrder.totalSatang)}</span> ({lastOrder.status})
            </div>
            <button type="button" onClick={handleReorder} disabled={submitting} style={{ minHeight: 34, padding: '0 14px', border: '1px solid #CBD5E1', borderRadius: 8, background: '#F8FAFC', color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t('custReorderBtn')}</button>
          </div>
        )}

        <CustomerProductCartList
          products={products} cart={cart} bagBalance={bags.balance} hasReturnBag={hasReturnBag} returnBagQty={returnBagQty}
          onChangeCartQty={(productId, nextQty) => setCart({ ...cart, [productId]: nextQty })}
          onToggleReturnBag={(enabled) => {
            if (!enabled) { setHasReturnBag(false); setReturnBagQty(0); }
            else if (bags.balance > 0) { setHasReturnBag(true); setReturnBagQty(Math.min(bags.balance, Math.max(1, returnBagQty))); }
          }}
          onChangeReturnBagQty={setReturnBagQty}
        />

        <div className="dg-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{t('custPaymentMethodLabel', { limit: formatBaht(creditLimitSatang) })}</span>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'PROMPTPAY' | 'CREDIT')} style={{ minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontWeight: 600, fontSize: 12, color: '#0F172A', background: '#FFFFFF' }}>
            <option value="CASH">{t('custPayCash')}</option><option value="PROMPTPAY">{t('custPayPromptPay')}</option><option value="CREDIT">{t('custPayCredit')}</option>
          </select>
        </div>
        {paymentMethod === 'PROMPTPAY' && <PromptPayQrCard totalSatang={totalSatang} compact />}
      </div>

      <div style={{ background: '#FFFFFF', borderTop: '1px solid #E2E8F0', padding: '12px 16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>{t('custTotalLabel')}</span>
          <span className="dg-num" style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>{formatBaht(totalSatang)}</span>
        </div>
        <button type="button" onClick={handlePlaceOrder} disabled={submitting} className="dg-btn-icon" style={{ flex: 1, minHeight: 48, border: 'none', borderRadius: 10, background: '#0F172A', color: '#FFFFFF', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          <IconCheck size={16} />
          <span>{submitting ? t('custOrdering') : t('custConfirmOrderBtn')}</span>
        </button>
      </div>
    </div>
  );
};
