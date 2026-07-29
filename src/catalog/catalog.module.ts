import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Product, ProductAttributeDefinition, ProductAttributeOption, ProductType, ServiceCatalog,
  ShopProduct, ShopService, VehicleBrand, VehicleModel, AuditLog, ProductManufacturer,
} from '../database/entities';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    VehicleBrand, VehicleModel, ProductType, ProductAttributeDefinition, ProductAttributeOption,
    Product, ProductManufacturer, ShopProduct, ServiceCatalog, ShopService, AuditLog,
  ])],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
