import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.types';
import { UserRole } from '../common/enums';
import { CatalogService } from './catalog.service';
import {
  ChangeStatusDto, ConfigureShopProductDto, ConfigureShopServiceDto, CreateAttributeDto,
  CreateAttributeOptionDto,
  CreateProductDto, CreateProductTypeDto, CreateServiceCatalogDto,
  CreateVehicleBrandDto,
  CreateVehicleModelDto, UpdateProductDto, UpdateProductVehicleModelsDto, UpdateVehicleModelPopularityDto,
} from './dto';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get('catalog/vehicle-brands') brands(@Query('search') search?: string) { return this.catalog.listBrands(search); }
  @Post('admin/catalog/vehicle-brands') @Roles(UserRole.SUPER_ADMIN)
  createBrand(@Body() dto: CreateVehicleBrandDto) { return this.catalog.createBrand(dto); }
  @Get('catalog/vehicle-models') models(@Query('brandId') brandId?: string) { return this.catalog.listModels(brandId); }
  @Post('admin/catalog/vehicle-models') @Roles(UserRole.SUPER_ADMIN)
  createModel(@Body() dto: CreateVehicleModelDto) { return this.catalog.createModel(dto); }
  @Patch('admin/catalog/vehicle-models/:id/popularity') @Roles(UserRole.SUPER_ADMIN)
  setModelPopularity(@Param('id') id: string, @Body() dto: UpdateVehicleModelPopularityDto) {
    return this.catalog.setModelPopularity(id, dto.isPopular);
  }
  @Get('catalog/product-types') types() { return this.catalog.listTypes(); }
  @Post('admin/catalog/product-types') @Roles(UserRole.SUPER_ADMIN)
  createType(@Body() dto: CreateProductTypeDto) { return this.catalog.createType(dto); }
  @Post('admin/catalog/product-types/:id/attributes') @Roles(UserRole.SUPER_ADMIN)
  addAttribute(@Param('id') id: string, @Body() dto: CreateAttributeDto) { return this.catalog.addAttribute(id, dto); }
  @Post('admin/catalog/product-types/:id/schemas/:version/publish') @Roles(UserRole.SUPER_ADMIN)
  publishSchema(@Param('id') id: string, @Param('version') version: string) {
    return this.catalog.publishSchema(id, Number(version));
  }
  @Get('catalog/product-types/:id/schema')
  schema(@Param('id') id: string, @Query('version') version?: string) {
    return this.catalog.getSchema(id, version ? Number(version) : undefined);
  }
  @Post('admin/catalog/attributes/:id/options') @Roles(UserRole.SUPER_ADMIN)
  addOption(@Param('id') id: string, @Body() dto: CreateAttributeOptionDto) {
    return this.catalog.addAttributeOption(id, dto);
  }
  @Post('admin/catalog/products') @Roles(UserRole.SUPER_ADMIN)
  createProduct(@Body() dto: CreateProductDto) { return this.catalog.createProduct(dto); }
  @Patch('admin/catalog/products/:id') @Roles(UserRole.SUPER_ADMIN)
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.catalog.updateProduct(id, dto);
  }
  @Get('catalog/products')
  products(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query('typeId') typeId?: string,
    @Query('attributes') attributes?: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.catalog.listProducts(
      user.role === UserRole.SUPER_ADMIN ? undefined : user.shopId,
      search,
      typeId,
      attributes,
      activeOnly === 'true',
      vehicleId,
    );
  }
  @Get('catalog/product-compatibilities')
  compatibilities(@Query('productId') productId?: string, @Query('modelId') modelId?: string) {
    return this.catalog.listCompatibilities(productId, modelId);
  }
  @Put('admin/catalog/products/:id/vehicle-models') @Roles(UserRole.SUPER_ADMIN)
  setProductVehicleModels(@Param('id') id: string, @Body() dto: UpdateProductVehicleModelsDto) {
    return this.catalog.setProductVehicleModels(id, dto.vehicleModelIds);
  }
  @Put('shop-products/:productId')
  configureProduct(@CurrentUser() user: AuthUser, @Param('productId') id: string, @Body() dto: ConfigureShopProductDto) {
    return this.catalog.configureProduct(user.shopId!, user.sub, id, dto);
  }
  @Get('catalog/services')
  services(@CurrentUser() user: AuthUser) {
    return this.catalog.listServices(user.role === UserRole.SUPER_ADMIN ? undefined : user.shopId);
  }
  @Post('admin/catalog/services') @Roles(UserRole.SUPER_ADMIN)
  createService(@Body() dto: CreateServiceCatalogDto) { return this.catalog.createService(dto); }
  @Put('shop-services/:serviceId')
  configureService(@CurrentUser() user: AuthUser, @Param('serviceId') id: string, @Body() dto: ConfigureShopServiceDto) {
    return this.catalog.configureService(user.shopId!, user.sub, id, dto);
  }
  @Put('admin/catalog/:entity/:id/status') @Roles(UserRole.SUPER_ADMIN)
  setStatus(
    @Param('entity') entity: 'vehicle-brand' | 'vehicle-model' | 'product-type' | 'product' | 'service',
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.catalog.setStatus(entity, id, dto.status);
  }
}
