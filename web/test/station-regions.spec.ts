import { describe, expect, it } from 'vitest';
import {
  countStationsByRegion,
  filterStationsByRegionAndQuery,
  groupStationsByRegion,
  resolveInitialRegionParam,
  STATION_REGIONS,
} from '../src/domain/station-regions';

const SAMPLE = [
  { id: 1, code: 'ST-01', name: 'สาขาสุขุมวิท 50', addressDetail: 'เขตคลองเตย กรุงเทพฯ', region: 'BANGKOK' as const, lat: 13.7, lng: 100.6, active: true, bagBalance: 50 },
  { id: 2, code: 'ST-03', name: 'สาขารามอินทรา 57', addressDetail: 'เขตบางเขน กรุงเทพฯ', region: 'BANGKOK' as const, lat: 13.85, lng: 100.64, active: true, bagBalance: 45 },
  { id: 11, code: 'ST-11', name: 'สาขาเชียงใหม่', addressDetail: 'อ.เมือง จ.เชียงใหม่', region: 'NORTH' as const, lat: 18.79, lng: 98.96, active: true, bagBalance: 50 },
  { id: 14, code: 'ST-14', name: 'สาขาสงขลา-หาดใหญ่', addressDetail: 'อ.หาดใหญ่ จ.สงขลา', region: 'SOUTH' as const, lat: 7.0, lng: 100.47, active: true, bagBalance: 50 },
];

describe('Frontend Station Regions Domain', () => {
  it('resolveInitialRegionParam: อ่านค่าพารามิเตอร์ region จาก URL และ liff.state อย่างปลอดภัย', () => {
    expect(STATION_REGIONS).toEqual(['BANGKOK', 'CENTRAL', 'NORTH', 'NORTHEAST', 'EAST', 'SOUTH']);
    expect(resolveInitialRegionParam('?tab=stations&region=BANGKOK')).toBe('BANGKOK');
    expect(resolveInitialRegionParam('?liff.state=%3Ftab%3Dstations%26region%3DSOUTH')).toBe('SOUTH');
    expect(resolveInitialRegionParam('?tab=stations&region=UNKNOWN')).toBe('ALL');
    expect(resolveInitialRegionParam('')).toBe('ALL');
  });

  it('filterStationsByRegionAndQuery & groupStationsByRegion: กรองตามภาค ค้นหาคำสำคัญ และจัดกลุ่มแยกกรุงเทพฯ กับภูมิภาคได้ถูกต้อง', () => {
    const counts = countStationsByRegion(SAMPLE);
    expect(counts.ALL).toBe(4);
    expect(counts.BANGKOK).toBe(2);
    expect(counts.NORTH).toBe(1);
    expect(counts.CENTRAL).toBe(0);

    const onlyBkk = filterStationsByRegionAndQuery(SAMPLE, 'BANGKOK', '');
    expect(onlyBkk).toHaveLength(2);

    const searchRam = filterStationsByRegionAndQuery(SAMPLE, 'ALL', 'รามอินทรา');
    expect(searchRam).toHaveLength(1);
    expect(searchRam[0].code).toBe('ST-03');

    const grouped = groupStationsByRegion(SAMPLE);
    expect(grouped.map((g) => g.region)).toEqual(['BANGKOK', 'NORTH', 'SOUTH']);
    expect(grouped[0].items).toHaveLength(2);
  });
});
