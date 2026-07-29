import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Product, ProductAttributeDefinition, ProductAttributeOption, ProductType, ServiceCatalog,
  ShopProduct, ShopService, VehicleBrand, VehicleModel, Vehicle,
  ProductVehicleCompatibility, AuditLog,
} from '../database/entities';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    VehicleBrand, VehicleModel, Vehicle, ProductType,
    ProductAttributeDefinition, ProductAttributeOption, Product, ProductVehicleCompatibility,
    ShopProduct, ServiceCatalog, ShopService, AuditLog,
  ])],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
