import React, { useCallback, useEffect, useState } from 'react';
import { staffApi } from '../api/role-api';
import { formatBaht, RiderUser, StaffOrder } from '../api/schemas';
import { uploadSelectedOrDemoPhoto } from '../domain/photo-picker';

interface Props {
  onNotify: (msg: string) => void;
}

export const WarehousePage: React.FC<Props> = ({ onNotify }) => {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [riders, setRiders] = useState<RiderUser[]>([]);
  const [selectedRiderByOrder, setSelectedRiderByOrder] = useState<Record<string, string>>({});
  const [countedByOrder, setCountedByOrder] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const loadWarehouse = useCallback(async () => {
    setLoading(true);
    try {
      const [ordList, ridList] = await Promise.all([
        staffApi.listOrders(undefined, 'dev-warehouse'),
        staffApi.listRiders('dev-warehouse'),
      ]);
      setOrders(ordList);
      setRiders(ridList);
      const defaultRiderId = ridList[0]?.id ?? '';
      const mapRiders: Record<string, string> = {};
      const mapCounted: Record<string, number> = {};
      for (const o of ordList) {
        mapRiders[o.id] = o.riderId ?? defaultRiderId;
        mapCounted[o.id] = o.expectBagReturn;
      }
      setSelectedRiderByOrder((prev) => ({ ...mapRiders, ...prev }));
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
    try {
      await staffApi.confirmOrder(o.id);
      onNotify(`รับออเดอร์ #${o.code} แล้ว (ขั้นที่ 2 CONFIRMED)`);
      await loadWarehouse();
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'รับออเดอร์ไม่สำเร็จ');
    }
  };

  const handleAssign = async (o: StaffOrder) => {
    const riderId = selectedRiderByOrder[o.id];
    if (!riderId) {
      onNotify('กรุณาเลือกไรเดอร์ก่อน');
      return;
    }
    try {
      await staffApi.assignRider(o.id, riderId);
      onNotify(`มอบหมายไรเดอร์ให้ออเดอร์ #${o.code} แล้ว`);
      await loadWarehouse();
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'มอบหมายไรเดอร์ไม่สำเร็จ');
    }
  };

  const handlePack = async (o: StaffOrder) => {
    try {
      await staffApi.packOrder(o.id);
      onNotify(`จัดของออเดอร์ #${o.code} แล้ว (ขั้นที่ 3 PACKED)`);
      await loadWarehouse();
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'จัดของไม่สำเร็จ');
    }
  };

  const handleReceiveBags = async (o: StaffOrder) => {
    try {
      const photoUrl = await uploadSelectedOrDemoPhoto(null, `wh-bag-${o.code}.png`);
      const counted = countedByOrder[o.id] ?? o.expectBagReturn;
      await staffApi.receiveBags(o.id, { evidence: { photoUrl, lat: 13.7563, lng: 100.5018 }, counted });
      onNotify(`คลังรับถุงคืนออเดอร์ #${o.code} จำนวน ${counted} ใบ เรียบร้อย (ขั้นที่ 8)`);
      await loadWarehouse();
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'รับถุงคืนเข้าคลังไม่สำเร็จ');
    }
  };

  const activeQueue = orders.filter((o) => ['PENDING', 'CONFIRMED', 'PACKED', 'BAG_COLLECTED'].includes(o.status));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#0F2236', color: '#FFFFFF', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>คลังสินค้า (Warehouse F3)</div>
          <div style={{ fontSize: 12, color: '#C5D2E0' }}>ขั้นที่ 2 รับออเดอร์ · มอบหมายไรเดอร์ · ขั้นที่ 8 รับถุงคืนเข้าคลัง</div>
        </div>
        <button type="button" onClick={loadWarehouse} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #33475B', background: '#1C3550', color: '#FFFFFF', fontSize: 12, cursor: 'pointer' }}>
          🔄 รีเฟรช
        </button>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {activeQueue.length === 0 ? (
          <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 14, textAlign: 'center', border: '1px solid #DCE4EC' }}>
            {loading ? 'กำลังโหลดคิวงานคลัง...' : 'ไม่มีออเดอร์ค้างดำเนินการที่คลังในขณะนี้'}
          </div>
        ) : (
          activeQueue.map((o) => (
            <div key={o.id} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>#{o.code}</span>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: o.status === 'BAG_COLLECTED' ? '#FCE8EF' : '#E6EEF9', color: o.status === 'BAG_COLLECTED' ? '#9B1B49' : '#123F85' }}>
                  {o.status}
                </span>
              </div>

              <div style={{ fontSize: 13, color: '#33475B' }}>
                ยอด {formatBaht(o.totalSatang)} ({o.paymentMethod}) · แจ้งคืนถุง {o.expectBagReturn} ใบ
              </div>

              {o.status === 'PENDING' && (
                <button type="button" onClick={() => handleConfirm(o)} style={{ minHeight: 44, borderRadius: 10, border: 'none', background: '#1A56B0', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}>
                  ✓ ขั้นที่ 2: รับคำสั่งซื้อ (CONFIRMED)
                </button>
              )}

              {(o.status === 'CONFIRMED' || o.status === 'PACKED') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      value={selectedRiderByOrder[o.id] ?? ''}
                      onChange={(e) => setSelectedRiderByOrder({ ...selectedRiderByOrder, [o.id]: e.target.value })}
                      style={{ flex: 1, minHeight: 42, padding: '0 10px', borderRadius: 10, border: '1px solid #9AABBD' }}
                    >
                      {riders.map((r) => (
                        <option key={r.id} value={r.id}>
                          🛵 {r.name} {r.zone ? `(โซน ${r.zone})` : ''}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => handleAssign(o)} style={{ minHeight: 42, padding: '0 14px', borderRadius: 10, border: 'none', background: '#0B6E8A', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}>
                      {o.riderId ? 'เปลี่ยนไรเดอร์' : 'มอบหมายไรเดอร์'}
                    </button>
                  </div>
                  {o.status === 'CONFIRMED' && (
                    <button type="button" onClick={() => handlePack(o)} style={{ minHeight: 40, borderRadius: 10, border: '1px solid #1A56B0', background: '#FFFFFF', color: '#1A56B0', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      คลังกดจัดของแทนไรเดอร์ (ขั้นที่ 3 PACKED)
                    </button>
                  )}
                </div>
              )}

              {o.status === 'BAG_COLLECTED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#FFF5F8', padding: 10, borderRadius: 10, border: '1px solid #F3C4D4' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#9B1B49' }}>ขั้นที่ 8: นับถุงคืนเข้าคลัง (พร้อมรูปหลักฐาน)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, flex: 1 }}>จำนวนถุงที่คลังนับได้จริง:</span>
                    <input
                      type="number"
                      min={0}
                      value={countedByOrder[o.id] ?? o.expectBagReturn}
                      onChange={(e) => setCountedByOrder({ ...countedByOrder, [o.id]: Math.max(0, Number(e.target.value)) })}
                      style={{ width: 72, minHeight: 40, textAlign: 'center', borderRadius: 8, border: '1px solid #9AABBD', fontWeight: 700 }}
                    />
                    <button type="button" onClick={() => handleReceiveBags(o)} style={{ minHeight: 42, padding: '0 14px', borderRadius: 10, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}>
                      📷 ยืนยันการส่งคืนถุง
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
