import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer, Vehicle } from '../database/entities';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Vehicle])],
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
