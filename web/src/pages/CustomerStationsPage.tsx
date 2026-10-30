import React, { useCallback, useEffect, useState } from 'react';
import { PublicStation, stationsApi } from '../api/stations-api';
import { IconSearch } from '../components/icons/ActionIcons';
import { IconBag, IconDroplet, IconMapPin, IconNavigation } from '../components/icons/Icons';
import {
  countStationsByRegion,
  filterStationsByRegionAndQuery,
  getStationRegionMeta,
  groupStationsByRegion,
  STATION_REGION_META,
  STATION_REGIONS,
  StationRegionFilter,
} from '../domain/station-regions';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  initialRegion?: StationRegionFilter;
  onBackToShop: () => void;
  onNotify: (msg: string) => void;
}

export const CustomerStationsPage: React.FC<Props> = ({ initialRegion = 'ALL', onBackToShop, onNotify }) => {
  const { t } = useI18n();
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
      <div key={st.id} className="dg-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
              <IconDroplet size={15} style={{ color: '#0369A1' }} />
              <span>{st.name}</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Code: <strong className="dg-num" style={{ color: '#334155' }}>{st.code}</strong>
            </div>
          </div>
          <span style={{ background: meta.bg, color: meta.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {t(meta.translationKey)}
          </span>
        </div>
        {st.distanceKm !== undefined && (
          <div className="dg-num" style={{ fontSize: 12, fontWeight: 600, color: '#047857' }}>
            {st.distanceKm.toFixed(1)} km
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: '#334155' }}>
          <IconMapPin size={14} style={{ marginTop: 2, color: '#64748B' }} />
          <span>{st.addressDetail}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#475569', fontWeight: 500 }}>
            {st.bagBalance !== undefined ? (
              <>
                <IconBag size={13} />
                <span>{t('stationsBagStock', { count: st.bagBalance })}</span>
              </>
            ) : null}
          </span>
          <a href={mapUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#0F172A', color: '#FFFFFF', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            <IconNavigation size={12} />
            <span>{t('stationsNavigateBtn')}</span>
          </a>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#FFFFFF', padding: '16px 16px 12px', borderBottom: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
              <IconMapPin size={18} style={{ color: '#0369A1' }} />
              <span>{t('stationsTitle')}</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{t('stationsSubtitle', { count: baseStations.length })}</div>
          </div>
          <button type="button" onClick={onBackToShop} className="dg-btn-icon" style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #0F172A', background: '#0F172A', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <IconDroplet size={13} />
            <span>{t('stationsOrderWaterBtn')}</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={handleFindNearest} disabled={locating} className="dg-btn-icon" style={{ flex: 1, minHeight: 38, borderRadius: 9, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <IconMapPin size={14} style={{ color: '#1D4ED8' }} />
            <span>{locating ? t('stationsLocating') : t('stationsFindNearestBtn')}</span>
          </button>
          {nearestList && (
            <button type="button" onClick={() => setNearestList(null)} style={{ minHeight: 38, padding: '0 12px', borderRadius: 9, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {t('stationsGroupByRegionBtn')}
            </button>
          )}
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <IconSearch size={15} style={{ position: 'absolute', insetInlineStart: 12, color: '#94A3B8', pointerEvents: 'none' }} />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('stationsSearchPlaceholder')} style={{ width: '100%', minHeight: 38, paddingInlineStart: 34, paddingInlineEnd: 12, borderRadius: 9, border: '1px solid #CBD5E1', fontSize: 13 }} />
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          <button type="button" onClick={() => setRegionFilter('ALL')} style={{ padding: '5px 12px', borderRadius: 99, border: regionFilter === 'ALL' ? '1px solid #0F172A' : '1px solid #E2E8F0', background: regionFilter === 'ALL' ? '#0F172A' : '#FFFFFF', color: regionFilter === 'ALL' ? '#FFFFFF' : '#475569', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}>
            {t('stationsAllRegions', { count: counts.ALL })}
          </button>
          {STATION_REGIONS.map((code) => {
            const m = STATION_REGION_META[code];
            const active = regionFilter === code;
            return (
              <button key={code} type="button" onClick={() => setRegionFilter(code)} style={{ padding: '5px 12px', borderRadius: 99, border: active ? '1px solid #0F172A' : '1px solid #E2E8F0', background: active ? '#0F172A' : '#FFFFFF', color: active ? '#FFFFFF' : '#475569', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                {t(m.translationKey)} (<span className="dg-num">{counts[code]}</span>)
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 28, color: '#64748B', fontSize: 13 }}>{t('riderLoadingJobs')}</div>
        ) : filtered.length === 0 ? (
          <div className="dg-card" style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 13 }}>0</div>
        ) : nearestList ? (
          filtered.map(renderCard)
        ) : (
          grouped.map((g) => (
            <div key={g.region} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderRadius: 9, background: '#F1F5F9', color: '#0F172A', fontWeight: 700, fontSize: 13 }}>
                <span>{t(g.meta.translationKey)}</span>
                <span className="dg-num" style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                  {t('stationsBranchCount', { count: g.items.length })}
                </span>
              </div>
              {g.items.map(renderCard)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
