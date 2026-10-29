import { z } from 'zod';
import { STATION_REGIONS } from '../domain/station-regions';
import { requestJson } from './role-api';

export const publicStationSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  name: z.string(),
  addressDetail: z.string(),
  region: z.enum(STATION_REGIONS).default('BANGKOK'),
  lat: z.number(),
  lng: z.number(),
  active: z.boolean().default(true),
  bagBalance: z.number().int().optional(),
  distanceKm: z.number().optional(),
});

export type PublicStation = z.infer<typeof publicStationSchema>;

export const stationsApi = {
  listActiveStations: async (): Promise<PublicStation[]> =>
    z.array(publicStationSchema).parse(await requestJson('/stations?activeOnly=true')),

  suggestNearest: async (lat: number, lng: number): Promise<PublicStation[]> =>
    z.array(publicStationSchema).parse(
      await requestJson(`/stations/suggest?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`),
    ),
};
