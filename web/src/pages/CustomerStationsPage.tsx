import React, { useCallback, useEffect, useState } from 'react';
import { PublicStation, stationsApi } from '../api/stations-api';
import {
  countStationsByRegion,
  filterStationsByRegionAndQuery,
  getStationRegionMeta,
  groupStationsByRegion,
  STATION_REGION_META,
  STATION_REGIONS,
  StationRegionFilter,
} from '../domain/station-regions';

interface Props {
  initialRegion?: StationRegionFilter;
  onBackToShop: () => void;
  onNotify: (msg: string) => void;
}

export const CustomerStationsPage: React.FC<Props> = ({ initialRegion = 'ALL', onBackToShop, onNotify }) => {
  const [stations, setStations] = useState<PublicStation[]>([]);
  const [nearestList, setNearestList] = useState<PublicStation[] | null>(null);
  const [regionFilter, setRegionFilter] = useState<StationRegionFilter>(initialRegion);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  const loadStations = useCallback(async () => {
    setLoading(true);
    try {
      setStations(await stationsApi.listActiveStations());
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'ดึงข้อมูลตู้เติมน้ำไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadStations();
  }, [loadStations]);

  const handleFindNearest = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      onNotify('อุปกรณ์นี้ไม่รองรับการดึงพิกัด GPS');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const sorted = await stationsApi.suggestNearest(pos.coords.latitude, pos.coords.longitude);
          setNearestList(sorted);
          onNotify(`พบตู้เติมน้ำใกล้คุณที่สุด: ${sorted[0]?.name ?? '-'}`);
        } catch (err) {
          onNotify(err instanceof Error ? err.message : 'คำนวณตู้ใกล้ฉันไม่สำเร็จ');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        onNotify('ไม่สามารถเข้าถึงพิกัด GPS ได้ กรุณาอนุญาตการแชร์ตำแหน่ง');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const baseStations = nearestList ?? stations;
  const counts = countStationsByRegion(baseStations);
  const filtered = filterStationsByRegionAndQuery(baseStations, regionFilter, searchQuery);
  const grouped = groupStationsByRegion(filtered);

  const renderCard = (st: PublicStation) => {
    const meta = getStationRegionMeta(st.region);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${st.lat},${st.lng}`)}`;
    return (
      <div key={st.id} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2236' }}>🚰 {st.name}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>รหัสสาขา: <b>{st.code}</b></div>
          </div>
          <span style={{ background: meta.bg, color: meta.color, padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {meta.emoji} {meta.shortLabel}
          </span>
        </div>
        {st.distanceKm !== undefined && (
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1E7B45' }}>📏 ห่างจากพิกัดของคุณประมาณ {st.distanceKm.toFixed(1)} กม.</div>
        )}
        <div style={{ fontSize: 13, color: '#33475B' }}>📍 {st.addressDetail}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <span style={{ fontSize: 12, color: '#1A56B0', fontWeight: 600 }}>
            {st.bagBalance !== undefined ? `🛍️ สต็อกถุงพร้อมจ่าย ${st.bagBalance} ใบ` : ''}
          </span>
          <a href={mapUrl} target="_blank" rel="noreferrer" style={{ padding: '7px 14px', borderRadius: 10, background: meta.color, color: '#FFFFFF', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            🗺️ นำทาง Google Maps
          </a>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#FFFFFF', padding: '16px 16px 12px', borderBottom: '1px solid #DCE4EC', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0B6E8A' }}>📍 ค้นหาตู้เติมน้ำทั่วไทย</div>
            <div style={{ fontSize: 12, color: '#4A5B6E' }}>แยกกรุงเทพฯ และ 5 ภูมิภาค ({baseStations.length} สาขา)</div>
          </div>
          <button type="button" onClick={onBackToShop} style={{ padding: '7px 12px', borderRadius: 12, border: '1px solid #1A56B0', background: '#E6EEF9', color: '#1A56B0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            💧 สั่งน้ำดื่ม
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={handleFindNearest} disabled={locating} style={{ flex: 1, minHeight: 40, borderRadius: 10, border: 'none', background: '#0B6E8A', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {locating ? '📡 กำลังค้นหาพิกัด...' : '📍 หาตู้ที่ใกล้ฉันที่สุด (GPS)'}
          </button>
          {nearestList && (
            <button type="button" onClick={() => setNearestList(null)} style={{ minHeight: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #9AABBD', background: '#FFFFFF', color: '#33475B', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              ดูแยกภาค
            </button>
          )}
        </div>

        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="🔍 ค้นหาชื่อสาขา เขต จังหวัด หรือรหัสตู้..." style={{ minHeight: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #9AABBD', fontSize: 13 }} />

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          <button type="button" onClick={() => setRegionFilter('ALL')} style={{ padding: '6px 12px', borderRadius: 16, border: 'none', background: regionFilter === 'ALL' ? '#0F2236' : '#E2E8F0', color: regionFilter === 'ALL' ? '#FFFFFF' : '#33475B', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}>
            ทั้งหมด ({counts.ALL})
          </button>
          {STATION_REGIONS.map((code) => {
            const m = STATION_REGION_META[code];
            const active = regionFilter === code;
            return (
              <button key={code} type="button" onClick={() => setRegionFilter(code)} style={{ padding: '6px 12px', borderRadius: 16, border: 'none', background: active ? m.color : '#E2E8F0', color: active ? '#FFFFFF' : '#33475B', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                {m.emoji} {m.shortLabel} ({counts[code]})
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#64748B', fontWeight: 600 }}>กำลังโหลดรายการตู้เติมน้ำ...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 20, textAlign: 'center', color: '#64748B', fontSize: 14 }}>ไม่พบตู้เติมน้ำในหมวดหรือคำค้นหานี้</div>
        ) : nearestList ? (
          filtered.map(renderCard)
        ) : (
          grouped.map((g) => (
            <div key={g.region} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderRadius: 10, background: g.meta.bg, color: g.meta.color, fontWeight: 800, fontSize: 14 }}>
                <span>{g.meta.emoji} {g.meta.label}</span>
                <span>{g.items.length} สาขา</span>
              </div>
              {g.items.map(renderCard)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
