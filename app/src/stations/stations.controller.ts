import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, Public, Roles, User } from '../common/auth';
import { parse } from '../common/validate';
import { STATION_REGIONS } from './station-regions';
import { StationsService } from './stations.service';

const regionSchema = z.enum(STATION_REGIONS);

const listStationsQuerySchema = z.object({
  region: regionSchema.optional(),
  activeOnly: z.enum(['true', 'false']).optional(),
});

const suggestQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const createStationSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(120),
  addressDetail: z.string().min(1).max(500),
  region: regionSchema.optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const updateStationSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  addressDetail: z.string().min(1).max(500).optional(),
  region: regionSchema.optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  active: z.boolean().optional(),
});

const bagMovementSchema = z.object({
  movement: z.enum(['RESTOCK_IN', 'ADJUST']),
  qty: z.number().int().refine((n) => n !== 0, 'จำนวนต้องไม่เป็น 0'),
  note: z.string().max(300).optional(),
});

@Controller()
export class StationsController {
  constructor(private readonly stations: StationsService) {}

  @Get('stations')
  @Public()
  listStations(@Query() q?: unknown) {
    const parsed = parse(listStationsQuerySchema, q ?? {});
    return this.stations.listStations({
      region: parsed.region,
      activeOnly: parsed.activeOnly === 'true',
    });
  }

  @Get('stations/suggest')
  @Public()
  suggestStations(@Query() q: unknown) {
    const { lat, lng } = parse(suggestQuerySchema, q);
    return this.stations.suggestStations(lat, lng);
  }

  @Post('admin/stations')
  @Roles('admin', 'warehouse')
  createStation(@Body() body: unknown) {
    return this.stations.createStation(parse(createStationSchema, body));
  }

  @Patch('admin/stations/:id')
  @Roles('admin', 'warehouse')
  updateStation(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.stations.updateStation(id, parse(updateStationSchema, body));
  }

  @Post('admin/stations/:id/bags')
  @Roles('admin', 'warehouse')
  manualBagMovement(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() u: User,
    @Body() body: unknown,
  ) {
    return this.stations.manualBagMovement(id, u.id, parse(bagMovementSchema, body));
  }

  @Get('admin/stations/:id/ledger')
  @Roles('admin', 'warehouse')
  stationLedger(@Param('id', ParseIntPipe) id: number) {
    return this.stations.ledgerOf(id);
  }
}
