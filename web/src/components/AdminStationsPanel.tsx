import React, { useCallback, useEffect, useState } from 'react';
import { adminMgmtApi, StationLedgerEntry, WaterStation } from '../api/admin-api';

interface Props {
  onNotify: (msg: string) => void;
}

export const AdminStationsPanel: React.FC<Props> = ({ onNotify }) => {
  const [stations, setStations] = useState<WaterStation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ledger, setLedger] = useState<StationLedgerEntry[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [lat, setLat] = useState('13.7563');
  const [lng, setLng] = useState('100.5018');
  const [restockQty, setRestockQty] = useState<Record<number, number>>({});
  const [restockNote, setRestockNote] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  const loadStations = useCallback(async () => {
    try {
      const list = await adminMgmtApi.listStations();
      setStations(list);
      const targetId = selectedId ?? list[0]?.id ?? null;
      setSelectedId(targetId);
      if (targetId) {
        setLedger(await adminMgmtApi.getStationLedger(targetId));
      }
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'ดึงข้อมูลตู้กดน้ำไม่สำเร็จ');
    }
  }, [selectedId, onNotify]);

  useEffect(() => {
    void loadStations();
  }, [loadStations]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !addressDetail.trim()) return onNotify('กรุณากรอกรหัส ชื่อตู้ และสถานที่ตั้ง');
    setBusy(true);
    try {
      await adminMgmtApi.createStation({
        code: code.trim(),
        name: name.trim(),
        addressDetail: addressDetail.trim(),
        lat: Number(lat),
        lng: Number(lng),
      });
      setCode('');
      setName('');
      setAddressDetail('');
      onNotify('เพิ่มจุดตู้กดน้ำใหม่เรียบร้อย');
      await loadStations();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'เพิ่มตู้กดน้ำไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const handleBagAction = async (stationId: number, movement: 'RESTOCK_IN' | 'ADJUST') => {
    const qty = restockQty[stationId] ?? 10;
    if (qty === 0) return onNotify('ระบุจำนวนถุงที่ไม่ใช่ 0');
    setBusy(true);
    try {
      await adminMgmtApi.addStationBags(stationId, {
        movement,
        qty,
        note: restockNote[stationId] || (movement === 'RESTOCK_IN' ? 'เติมถุงเข้าตู้' : 'ปรับปรุงสต็อกถุง'),
      });
      onNotify(`อัปเดตสต็อกถุงตู้ #${stationId} เรียบร้อย`);
      await loadStations();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'อัปเดตสต็อกถุงไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <form
        onSubmit={handleCreate}
        style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2236' }}>🚰 เพิ่มจุดตู้กดน้ำ / ตู้เติมน้ำใหม่ (พร้อมพิกัดนำทางไรเดอร์)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="รหัสตู้ (เช่น ST-03)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อตู้กดน้ำ / สาขา" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="รายละเอียดที่ตั้งตู้กดน้ำ" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude (เช่น 13.7563)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude (เช่น 100.5018)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
        </div>
        <button type="submit" disabled={busy} style={{ minHeight: 40, borderRadius: 10, border: 'none', background: '#0B6E8A', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
          + บันทึกเพิ่มตู้กดน้ำ
        </button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {stations.map((st) => (
          <div
            key={st.id}
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              border: selectedId === st.id ? '2px solid #0B6E8A' : '1px solid #DCE4EC',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{st.code} · {st.name}</span>
                <div style={{ fontSize: 12, color: '#4A5B6E' }}>📍 {st.addressDetail} ({st.lat.toFixed(4)}, {st.lng.toFixed(4)})</div>
              </div>
              <div style={{ background: '#E6F4F8', color: '#0B6E8A', padding: '6px 12px', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700 }}>สต็อกถุงในตู้</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{st.bagBalance} ใบ</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${st.lat},${st.lng}`}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '5px 10px', borderRadius: 8, background: '#E8F8EE', color: '#058C3B', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
              >
                🗺️ ดูพิกัดนำทาง Google Maps
              </a>
              <button
                type="button"
                onClick={() => setSelectedId(st.id)}
                style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #0B6E8A', background: selectedId === st.id ? '#0B6E8A' : '#FFFFFF', color: selectedId === st.id ? '#FFFFFF' : '#0B6E8A', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                📋 ดูประวัติรับเข้า-จ่ายออกของสมาชิก
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 6, borderTop: '1px solid #EEF2F6' }}>
              <input
                type="number"
                value={restockQty[st.id] ?? 10}
                onChange={(e) => setRestockQty({ ...restockQty, [st.id]: Number(e.target.value) })}
                style={{ width: 64, minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD', fontWeight: 700 }}
              />
              <input
                value={restockNote[st.id] ?? ''}
                onChange={(e) => setRestockNote({ ...restockNote, [st.id]: e.target.value })}
                placeholder="หมายเหตุเติมถุง/ปรับยอด"
                style={{ flex: 1, minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD', fontSize: 12 }}
              />
              <button type="button" onClick={() => handleBagAction(st.id, 'RESTOCK_IN')} disabled={busy} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                +รับเข้าตู้
              </button>
              <button type="button" onClick={() => handleBagAction(st.id, 'ADJUST')} disabled={busy} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: 'none', background: '#4A5B6E', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                ปรับยอด
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedId && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            📊 ประวัติรับเข้า–จ่ายออกถุงประจำตู้ #{selectedId} (เชื่อมกับสมาชิกและออเดอร์)
          </div>
          {ledger.length === 0 ? (
            <div style={{ fontSize: 13, color: '#64748B' }}>ยังไม่มีรายการเคลื่อนไหว</div>
          ) : (
            ledger.map((l) => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
                <div>
                  <span style={{ fontWeight: 700, color: l.qty > 0 ? '#1E7B45' : '#C2255C' }}>
                    {l.movement === 'RESTOCK_IN' && '🟢 เติมถุงเข้าตู้'}
                    {l.movement === 'DISPENSED_OUT' && '🔴 เบิกถุงกดน้ำให้สมาชิก'}
                    {l.movement === 'RETURNED_IN' && '🔵 รับถุงคืนจากสมาชิกเข้าตู้'}
                    {l.movement === 'ADJUST' && '⚙️ ปรับยอดสต็อก'}
                  </span>{' '}
                  {l.customerName && <span>· สมาชิก: <b>{l.customerName}</b></span>}{' '}
                  {l.orderCode && <span>(#{l.orderCode})</span>}{' '}
                  {l.note && <span style={{ color: '#64748B' }}>— {l.note}</span>}
                </div>
                <span style={{ fontWeight: 800, fontSize: 14, color: l.qty > 0 ? '#1E7B45' : '#C2255C' }}>
                  {l.qty > 0 ? `+${l.qty}` : l.qty} ใบ
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
