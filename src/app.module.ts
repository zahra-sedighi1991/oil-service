import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ENTITIES } from './database/entities';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { CatalogModule } from './catalog/catalog.module';
import { CrmModule } from './crm/crm.module';
import { ServiceOrdersModule } from './service-orders/service-orders.module';
import { PublicBookModule } from './public-book/public-book.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SuggestionsModule } from './suggestions/suggestions.module';
import { HealthController } from './health.controller';
import { BillingModule } from './billing/billing.module';
import { ShopsModule } from './shops/shops.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        return {
          type: 'postgres' as const,
          ...(databaseUrl ? { url: databaseUrl } : {
            host: config.get('DB_HOST', 'localhost'),
            port: Number(config.get('DB_PORT', 5432)),
            username: config.get('DB_USER', 'postgres'),
            password: config.get('DB_PASSWORD', 'postgres'),
            database: config.get('DB_NAME', 'oil_service'),
          }),
          entities: ENTITIES,
          synchronize: config.get('DB_SYNCHRONIZE', 'false') === 'true',
          logging: config.get('DB_LOGGING', 'false') === 'true',
        };
      },
    }),
    AuthModule,
    CatalogModule,
    CrmModule,
    ServiceOrdersModule,
    PublicBookModule,
    DashboardModule,
    SuggestionsModule,
    BillingModule,
    ShopsModule,
    AuditModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
