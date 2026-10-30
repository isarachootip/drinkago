import React, { useCallback, useEffect, useState } from 'react';
import { customerApi } from '../api/role-api';
import { BagSummary, CustomerAddress, formatBaht, Product, StaffOrder, SuggestedStation } from '../api/schemas';
import { CustomerAddressCard } from '../components/CustomerAddressCard';
import { CustomerProductCartList } from '../components/CustomerProductCartList';
import { LineBanner } from '../components/LineBanner';
import { PromptPayQrCard } from '../components/PromptPayQrCard';
import { pickPreferredAddress } from '../domain/navigation';

interface Props { customerUser: string; onOrderCreated: (orderId: string) => void; onGoTrack: () => void; onGoStations?: () => void; onGoEvents?: () => void; onNotify: (msg: string) => void }

export const CustomerOrderPage: React.FC<Props> = ({ customerUser, onOrderCreated, onGoTrack, onGoStations, onGoEvents, onNotify }) => {
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
  const [creditLimitSatang, setCreditLimitSatang] = useState<number>(100000); const [lastOrder, setLastOrder] = useState<StaffOrder | null>(null); const [submitting, setSubmitting] = useState(false);

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
      onNotify(`สั่งซื้อสำเร็จ #${order.code} (ส่งงานเข้าคิวไรเดอร์ทันที)`); onOrderCreated(order.id);
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
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1A56B0' }}>ลงทะเบียนลูกค้าใหม่ (PDPA)</div>
        <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="ชื่อ-นามสกุล" style={{ minHeight: 44, padding: '0 12px', borderRadius: 10, border: '1px solid #9AABBD' }} />
        <input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="เบอร์โทรศัพท์ (เช่น 0812345678)" style={{ minHeight: 44, padding: '0 12px', borderRadius: 10, border: '1px solid #9AABBD' }} />
        <button type="submit" disabled={submitting} style={{ minHeight: 48, borderRadius: 12, border: 'none', background: '#1A56B0', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}>ยอมรับ PDPA และเริ่มสั่งน้ำดื่ม</button>
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
      <div style={{ background: '#FFFFFF', padding: '16px 16px 12px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid #DCE4EC' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1A56B0' }}>Drink&amp;Go</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {onGoEvents && <button type="button" onClick={onGoEvents} style={{ padding: '6px 9px', borderRadius: 12, border: '1px solid #7C3AED', background: '#F3E8FF', color: '#6B21A8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📅 กิจกรรม</button>}
            {onGoStations && <button type="button" onClick={onGoStations} style={{ padding: '6px 9px', borderRadius: 12, border: '1px solid #0B6E8A', background: '#E0F2FE', color: '#0B6E8A', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📍 ตู้ทั่วไทย</button>}
            <button type="button" onClick={onGoTrack} style={{ padding: '6px 10px', borderRadius: 12, border: '1px solid #1A56B0', background: '#E6EEF9', color: '#1A56B0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📦 สถานะ / OTP ({registeredName})</button>
          </div>
        </div>
        <LineBanner customerUser={customerUser} />
        <CustomerAddressCard
          addresses={addresses}
          activeAddr={activeAddr}
          onSelectAddress={(id) => void handleSelectAddress(id)}
          onSaveNewAddress={handleSaveNewAddress}
          onNotify={onNotify}
        />
        {suggestedStations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', border: '1px solid #0B6E8A', borderRadius: 12, background: '#F0F9FF' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0B6E8A' }}>
              🚰 ตู้กดน้ำที่ใกล้คุณที่สุด (แนะนำอัตโนมัติ): {suggestedStations[0].code} · ห่าง {suggestedStations[0].distanceKm} กม.
            </div>
            <select value={selectedStationId ?? suggestedStations[0].id} onChange={(e) => setSelectedStationId(Number(e.target.value))} style={{ minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #0B6E8A', fontSize: 13, fontWeight: 600, background: '#FFFFFF' }}>
              {suggestedStations.map((st, i) => (
                <option key={st.id} value={st.id}>{i === 0 ? '⭐ แนะนำใกล้สุด: ' : '🚰 '}{st.code} · {st.name} (ห่าง {st.distanceKm} กม.)</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {lastOrder && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#E6EEF9', borderRadius: 14 }}>
            <div style={{ flex: 1, fontSize: 13 }}><b>ล่าสุด #{lastOrder.code}</b> · {formatBaht(lastOrder.totalSatang)} ({lastOrder.status})</div>
            <button type="button" onClick={handleReorder} disabled={submitting} style={{ minHeight: 38, padding: '0 14px', border: 'none', borderRadius: 20, background: '#1A56B0', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>สั่งซ้ำ</button>
          </div>
        )}

        <CustomerProductCartList
          products={products}
          cart={cart}
          bagBalance={bags.balance}
          hasReturnBag={hasReturnBag}
          returnBagQty={returnBagQty}
          onChangeCartQty={(productId, nextQty) => setCart({ ...cart, [productId]: nextQty })}
          onToggleReturnBag={(enabled) => {
            if (!enabled) {
              setHasReturnBag(false);
              setReturnBagQty(0);
            } else if (bags.balance > 0) {
              setHasReturnBag(true);
              setReturnBagQty(Math.min(bags.balance, Math.max(1, returnBagQty)));
            }
          }}
          onChangeReturnBagQty={setReturnBagQty}
        />

        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#4A5B6E' }}>วิธีชำระเงิน (วงเงิน {formatBaht(creditLimitSatang)})</span>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'PROMPTPAY' | 'CREDIT')} style={{ minHeight: 38, padding: '0 10px', borderRadius: 10, border: '1px solid #9AABBD', fontWeight: 600 }}>
            <option value="CASH">เงินสดปลายทาง (CASH)</option><option value="PROMPTPAY">สแกนโอน PromptPay QR</option><option value="CREDIT">วงเงินเครดิตสมาชิก (CREDIT)</option>
          </select>
        </div>
        {paymentMethod === 'PROMPTPAY' && <PromptPayQrCard totalSatang={totalSatang} compact />}
      </div>

      <div style={{ background: '#FFFFFF', borderTop: '1px solid #DCE4EC', padding: '12px 16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 12, color: '#4A5B6E' }}>ยอดรวมทั้งหมด</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{formatBaht(totalSatang)}</span>
        </div>
        <button type="button" onClick={handlePlaceOrder} disabled={submitting} style={{ flex: 1, minHeight: 50, border: 'none', borderRadius: 14, background: '#1A56B0', color: '#FFFFFF', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
          {submitting ? 'กำลังสั่งซื้อ...' : '🚀 ยืนยันสั่งซื้อ (ส่งตรงถึงบ้าน)'}
        </button>
      </div>
    </div>
  );
};
