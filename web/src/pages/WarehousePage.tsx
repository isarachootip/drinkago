import React, { useCallback, useEffect, useState } from 'react';
import { adminMgmtApi, WaterStation } from '../api/admin-api';
import { staffApi } from '../api/role-api';
import { formatBaht, RiderUser, StaffOrder } from '../api/schemas';
import { IconCamera, IconCheck, IconRefresh } from '../components/icons/ActionIcons';
import { IconDroplet } from '../components/icons/Icons';
import { uploadSelectedOrDemoPhoto } from '../domain/photo-picker';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  onNotify: (msg: string) => void;
}

export const WarehousePage: React.FC<Props> = ({ onNotify }) => {
  const { t } = useI18n();
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [riders, setRiders] = useState<RiderUser[]>([]);
  const [stations, setStations] = useState<WaterStation[]>([]);
  const [selectedRiderByOrder, setSelectedRiderByOrder] = useState<Record<string, string>>({});
  const [selectedStationByOrder, setSelectedStationByOrder] = useState<Record<string, number>>({});
  const [countedByOrder, setCountedByOrder] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const loadWarehouse = useCallback(async () => {
    setLoading(true);
    try {
      const [ordList, ridList, stList] = await Promise.all([
        staffApi.listOrders(undefined, 'dev-warehouse'),
        staffApi.listRiders('dev-warehouse'),
        adminMgmtApi.listStations('dev-warehouse'),
      ]);
      setOrders(ordList);
      setRiders(ridList);
      setStations(stList);
      const defaultRiderId = ridList[0]?.id ?? '';
      const defaultStationId = stList[0]?.id ?? 1;
      const mapRiders: Record<string, string> = {};
      const mapStations: Record<string, number> = {};
      const mapCounted: Record<string, number> = {};
      for (const o of ordList) {
        mapRiders[o.id] = o.riderId ?? defaultRiderId;
        mapStations[o.id] = o.stationId ?? defaultStationId;
        mapCounted[o.id] = o.expectBagReturn;
      }
      setSelectedRiderByOrder((prev) => ({ ...mapRiders, ...prev }));
      setSelectedStationByOrder((prev) => ({ ...mapStations, ...prev }));
      setCountedByOrder((prev) => ({ ...mapCounted, ...prev }));
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'โหลดข้อมูลคลังสินค้าไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadWarehouse();
  }, [loadWarehouse]);

  const handleConfirm = async (o: StaffOrder) => {
    try { await staffApi.confirmOrder(o.id); onNotify(`รับออเดอร์ #${o.code} แล้ว (CONFIRMED)`); await loadWarehouse(); }
    catch (e) { onNotify(e instanceof Error ? e.message : 'รับออเดอร์ไม่สำเร็จ'); }
  };

  const handleAssign = async (o: StaffOrder) => {
    const riderId = selectedRiderByOrder[o.id];
    const stationId = selectedStationByOrder[o.id];
    if (!riderId) return onNotify('กรุณาเลือกไรเดอร์ก่อน');
    try { await staffApi.assignRider(o.id, riderId, stationId); onNotify(`มอบหมายไรเดอร์ให้ออเดอร์ #${o.code} แล้ว`); await loadWarehouse(); }
    catch (e) { onNotify(e instanceof Error ? e.message : 'มอบหมายไรเดอร์ไม่สำเร็จ'); }
  };

  const handlePack = async (o: StaffOrder) => {
    try { await staffApi.packOrder(o.id); onNotify(`จัดของออเดอร์ #${o.code} แล้ว (PACKED)`); await loadWarehouse(); }
    catch (e) { onNotify(e instanceof Error ? e.message : 'จัดของไม่สำเร็จ'); }
  };

  const handleReceiveBags = async (o: StaffOrder) => {
    try {
      const photoUrl = await uploadSelectedOrDemoPhoto(null, `wh-bag-${o.code}.png`);
      const counted = countedByOrder[o.id] ?? o.expectBagReturn;
      await staffApi.receiveBags(o.id, { evidence: { photoUrl, lat: 13.7563, lng: 100.5018 }, counted });
      onNotify(`รับถุงคืนออเดอร์ #${o.code} จำนวน ${counted} ใบ เรียบร้อย`);
      await loadWarehouse();
    } catch (e) { onNotify(e instanceof Error ? e.message : 'รับถุงคืนเข้าคลังไม่สำเร็จ'); }
  };

  const activeQueue = orders.filter((o) => ['PENDING', 'CONFIRMED', 'PACKED', 'BAG_COLLECTED'].includes(o.status));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#0F172A', color: '#FFFFFF', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{t('adminHeaderTitle')}</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>{t('adminTabStations')} · {t('adminTabRiders')}</div>
        </div>
        <button type="button" onClick={loadWarehouse} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#FFFFFF', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <IconRefresh size={14} /> {t('adminRefreshBtn')}
        </button>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {activeQueue.length === 0 ? (
          <div className="dg-card" style={{ padding: 20, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
            {loading ? '...' : t('trackNoOrders')}
          </div>
        ) : (
          activeQueue.map((o) => {
            const st = stations.find((s) => s.id === (selectedStationByOrder[o.id] ?? o.stationId));
            return (
              <div key={o.id} className="dg-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="dg-num" style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>#{o.code}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: o.status === 'BAG_COLLECTED' ? '#FCE7F3' : '#EFF6FF', color: o.status === 'BAG_COLLECTED' ? '#9D174D' : '#1D4ED8' }}>
                    {o.status}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: '#334155' }}>
                  <span className="dg-num">{formatBaht(o.totalSatang)}</span> ({o.paymentMethod}) · <span className="dg-num">{o.expectBagReturn}</span>
                  {st && (
                    <div style={{ color: '#0284C7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <IconDroplet size={14} /> {st.code} · {st.name} (<span className="dg-num">{st.bagBalance}</span>)
                    </div>
                  )}
                </div>

                {o.status === 'PENDING' && (
                  <button type="button" onClick={() => handleConfirm(o)} className="dg-btn-primary" style={{ minHeight: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
                    <IconCheck size={15} /> CONFIRMED
                  </button>
                )}

                {(o.status === 'CONFIRMED' || o.status === 'PACKED') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <select value={selectedStationByOrder[o.id] ?? ''} onChange={(e) => setSelectedStationByOrder({ ...selectedStationByOrder, [o.id]: Number(e.target.value) })} className="dg-input" style={{ minHeight: 38, fontSize: 13 }}>
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>{s.code} · {s.name} ({s.bagBalance})</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select value={selectedRiderByOrder[o.id] ?? ''} onChange={(e) => setSelectedRiderByOrder({ ...selectedRiderByOrder, [o.id]: e.target.value })} className="dg-input" style={{ flex: 1, minHeight: 40, fontSize: 13 }}>
                        {riders.map((r) => (
                          <option key={r.id} value={r.id}>{r.name} {r.zone ? `(${r.zone})` : ''}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => handleAssign(o)} style={{ minHeight: 40, padding: '0 14px', borderRadius: 8, border: 'none', background: '#0F172A', color: '#FFFFFF', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                        {t('adminTabRiders')}
                      </button>
                    </div>
                    {o.status === 'CONFIRMED' && (
                      <button type="button" onClick={() => handlePack(o)} className="dg-btn-secondary" style={{ minHeight: 38, fontSize: 12, cursor: 'pointer' }}>
                        PACKED
                      </button>
                    )}
                  </div>
                )}

                {o.status === 'BAG_COLLECTED' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#FDF2F8', padding: 10, borderRadius: 10, border: '1px solid #FBCFE8' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#9D174D' }}>BAG_COLLECTED</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" min={0} value={countedByOrder[o.id] ?? o.expectBagReturn} onChange={(e) => setCountedByOrder({ ...countedByOrder, [o.id]: Math.max(0, Number(e.target.value)) })} className="dg-input dg-num" style={{ width: 72, minHeight: 40, textAlign: 'center', fontWeight: 700 }} />
                      <button type="button" onClick={() => handleReceiveBags(o)} style={{ flex: 1, minHeight: 40, padding: '0 14px', borderRadius: 8, border: 'none', background: '#059669', color: '#FFFFFF', fontWeight: 600, fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
                        <IconCamera size={14} /> <IconCheck size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
