import React, { useCallback, useEffect, useState } from 'react';
import { adminMgmtApi, StationLedgerEntry, WaterStation } from '../api/admin-api';
import {
  countStationsByRegion,
  filterStationsByRegionAndQuery,
  STATION_REGION_META,
  STATION_REGIONS,
  StationRegion,
  StationRegionFilter,
} from '../domain/station-regions';
import { AdminStationsView } from './AdminStationsView';
import { AdminViewMode, getSavedViewMode, ViewModeToggle } from './ViewModeToggle';

interface Props {
  onNotify: (msg: string) => void;
  viewMode?: AdminViewMode;
  onViewModeChange?: (mode: AdminViewMode) => void;
}

export const AdminStationsPanel: React.FC<Props> = ({ onNotify, viewMode: propMode, onViewModeChange }) => {
  const [localMode, setLocalMode] = useState<AdminViewMode>(() => getSavedViewMode());
  const viewMode = propMode ?? localMode;
  const handleModeChange = (m: AdminViewMode) => {
    setLocalMode(m);
    onViewModeChange?.(m);
  };

  const [stations, setStations] = useState<WaterStation[]>([]);
  const [regionFilter, setRegionFilter] = useState<StationRegionFilter>('ALL');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ledger, setLedger] = useState<StationLedgerEntry[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [region, setRegion] = useState<StationRegion>('BANGKOK');
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
        region,
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

  const handleRegionChange = async (stationId: number, nextRegion: StationRegion) => {
    setBusy(true);
    try {
      await adminMgmtApi.updateStation(stationId, { region: nextRegion });
      onNotify(`อัปเดตภูมิภาคตู้ #${stationId} เป็น ${STATION_REGION_META[nextRegion].label} เรียบร้อย`);
      await loadStations();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'อัปเดตภูมิภาคไม่สำเร็จ');
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

  const counts = countStationsByRegion(stations);
  const filteredStations = filterStationsByRegionAndQuery(stations, regionFilter, '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <form onSubmit={handleCreate} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2236' }}>🚰 เพิ่มจุดตู้กดน้ำ / ตู้เติมน้ำใหม่ (แยกกรุงเทพฯ และภูมิภาค)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="รหัสตู้ (เช่น ST-16)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อตู้กดน้ำ / สาขา" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="รายละเอียดที่ตั้งตู้กดน้ำ" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <select value={region} onChange={(e) => setRegion(e.target.value as StationRegion)} style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #0B6E8A', fontWeight: 700, color: '#0B6E8A' }}>
            {STATION_REGIONS.map((codeOpt) => (
              <option key={codeOpt} value={codeOpt}>{STATION_REGION_META[codeOpt].emoji} {STATION_REGION_META[codeOpt].label}</option>
            ))}
          </select>
          <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude (เช่น 13.7563)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude (เช่น 100.5018)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
        </div>
        <button type="submit" disabled={busy} style={{ minHeight: 40, borderRadius: 10, border: 'none', background: '#0B6E8A', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>+ บันทึกเพิ่มตู้กดน้ำ</button>
      </form>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setRegionFilter('ALL')} style={{ padding: '6px 12px', borderRadius: 16, border: 'none', background: regionFilter === 'ALL' ? '#0F2236' : '#E2E8F0', color: regionFilter === 'ALL' ? '#FFFFFF' : '#33475B', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          ทั้งหมด ({counts.ALL})
        </button>
        {STATION_REGIONS.map((c) => {
          const m = STATION_REGION_META[c];
          const active = regionFilter === c;
          return (
            <button key={c} type="button" onClick={() => setRegionFilter(c)} style={{ padding: '6px 12px', borderRadius: 16, border: 'none', background: active ? m.color : '#E2E8F0', color: active ? '#FFFFFF' : '#33475B', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {m.emoji} {m.shortLabel} ({counts[c]})
            </button>
          );
        })}
      </div>

      <ViewModeToggle mode={viewMode} onChange={handleModeChange} title="รายการจุดตู้กดน้ำและสต็อกถุง" count={filteredStations.length} />

      <AdminStationsView
        stations={filteredStations} viewMode={viewMode} selectedId={selectedId}
        restockQty={restockQty} restockNote={restockNote} busy={busy}
        onSelect={setSelectedId}
        onQtyChange={(id, qty) => setRestockQty({ ...restockQty, [id]: qty })}
        onNoteChange={(id, note) => setRestockNote({ ...restockNote, [id]: note })}
        onRegionChange={handleRegionChange}
        onBagAction={handleBagAction}
      />

      {selectedId && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>📊 ประวัติรับเข้า–จ่ายออกถุงประจำตู้ #{selectedId}</div>
          {ledger.length === 0 ? <div style={{ fontSize: 13, color: '#64748B' }}>ยังไม่มีรายการเคลื่อนไหว</div> : ledger.map((l) => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <span style={{ fontWeight: 700, color: l.qty > 0 ? '#1E7B45' : '#C2255C' }}>
                  {l.movement === 'RESTOCK_IN' && '🟢 เติมถุงเข้าตู้'}{l.movement === 'DISPENSED_OUT' && '🔴 เบิกถุงกดน้ำให้สมาชิก'}
                  {l.movement === 'RETURNED_IN' && '🔵 รับถุงคืนจากสมาชิกเข้าตู้'}{l.movement === 'ADJUST' && '⚙️ ปรับยอดสต็อก'}
                </span>{' '}
                {l.customerName && <span>· สมาชิก: <b>{l.customerName}</b></span>} {l.orderCode && <span>(#{l.orderCode})</span>} {l.note && <span style={{ color: '#64748B' }}>— {l.note}</span>}
              </div>
              <span style={{ fontWeight: 800, fontSize: 14, color: l.qty > 0 ? '#1E7B45' : '#C2255C' }}>{l.qty > 0 ? `+${l.qty}` : l.qty} ใบ</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
