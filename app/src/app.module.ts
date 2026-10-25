import { Controller, Get, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BagLedgerService } from './bags/bag-ledger.service';
import { CatalogController } from './catalog/catalog.controller';
import { AuthGuard, Public } from './common/auth';
import { ErrorFilter } from './common/errors';
import { IdempotencyInterceptor } from './common/idempotency.interceptor';
import { IdempotencyService } from './common/idempotency.service';
import { APP_CONFIG, AppConfig, loadConfig } from './config';
import { AdminManagementController } from './customers/admin-management.controller';
import { AdminCustomersController, MeController } from './customers/customers.controller';
import { DbModule } from './db/db.module';
import { LineWebhookController } from './line/line-webhook.controller';
import { NotificationsService } from './notifications/notifications.service';
import { OrdersController, RiderController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { StationsController } from './stations/stations.controller';
import { StationsService } from './stations/stations.service';
import { LocalStorageService } from './uploads/local-storage.service';
import { FILE_STORAGE } from './uploads/storage.interface';
import { UploadsController } from './uploads/uploads.controller';

@Controller('health')
class HealthController {
  @Get()
  @Public()
  health() {
    return { ok: true };
  }
}

@Module({})
export class AppModule {
  static forRoot(cfg: AppConfig = loadConfig()) {
    return {
      module: AppModule,
      imports: [
        { module: ConfigHolder, providers: [{ provide: APP_CONFIG, useValue: cfg }], exports: [APP_CONFIG], global: true },
        DbModule,
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
      ],
      controllers: [
        HealthController,
        MeController,
        AdminCustomersController,
        AdminManagementController,
        CatalogController,
        OrdersController,
        RiderController,
        StationsController,
        LineWebhookController,
        UploadsController,
      ],
      providers: [
        BagLedgerService,
        StationsService,
        NotificationsService,
        OrdersService,
        IdempotencyService,
        IdempotencyInterceptor,
        { provide: FILE_STORAGE, useClass: LocalStorageService },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_FILTER, useClass: ErrorFilter },
      ],
    };
  }
}

@Module({})
class ConfigHolder {}
