import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Shop } from '../database/entities';
import { AdminShopsController, ShopsController } from './shops.controller';
import { AdminShopsService } from './admin-shops.service';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, AuditLog])],
  controllers: [ShopsController, AdminShopsController],
  providers: [AdminShopsService],
})
export class ShopsModule {}
