import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Shop } from '../database/entities';
import { AdminShopsController, ShopsController } from './shops.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, AuditLog])],
  controllers: [ShopsController, AdminShopsController],
})
export class ShopsModule {}
