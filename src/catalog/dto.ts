import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsArray,
  IsString,
  Min,
} from 'class-validator';
import { RecordStatus } from '../common/enums';

export class CreateVehicleBrandDto {
  @IsString() @IsNotEmpty() nameFa: string;
  @IsString() @IsOptional() nameEn?: string;
  @IsString() @IsNotEmpty() slug: string;
}
export class CreateVehicleModelDto extends CreateVehicleBrandDto {
  @IsString() @IsNotEmpty() brandId: string;
  @IsBoolean() @IsOptional() isPopular?: boolean;
}
export class UpdateVehicleModelPopularityDto {
  @IsBoolean() isPopular: boolean;
}
export class CreateProductTypeDto {
  @IsString() @IsNotEmpty() key: string;
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() titleTemplate?: string;
}
export class CreateAttributeDto {
  @IsInt() @Min(1) schemaVersion: number;
  @IsString() @IsNotEmpty() key: string;
  @IsString() @IsNotEmpty() labelFa: string;
  @IsString() @IsOptional() labelEn?: string;
  @IsString() @IsNotEmpty() dataType: string;
  @IsBoolean() @IsOptional() required?: boolean;
  @IsObject() @IsOptional() config?: Record<string, unknown>;
  @IsBoolean() @IsOptional() searchable?: boolean;
  @IsBoolean() @IsOptional() filterable?: boolean;
  @IsBoolean() @IsOptional() showInTitle?: boolean;
  @IsBoolean() @IsOptional() showOnInvoice?: boolean;
  @IsInt() @IsOptional() sortOrder?: number;
}
export class CreateAttributeOptionDto {
  @IsString() @IsNotEmpty() value: string;
  @IsString() @IsNotEmpty() label: string;
  @IsInt() @IsOptional() sortOrder?: number;
}
export class CreateProductDto {
  @IsString() productTypeId: string;
  @IsString() @IsOptional() name?: string;
  @IsObject() attributes: Record<string, unknown>;
  @IsArray() @IsString({ each: true }) @IsOptional() vehicleModelIds?: string[];
}
export class UpdateProductVehicleModelsDto {
  @IsArray() @IsString({ each: true }) vehicleModelIds: string[];
}
export class UpdateProductDto {
  @IsString() @IsNotEmpty() productTypeId: string;
  @IsString() @IsNotEmpty() name: string;
  @IsObject() attributes: Record<string, unknown>;
  @IsArray() @IsString({ each: true }) vehicleModelIds: string[];
}
export class ConfigureShopProductDto {
  @IsInt() @Min(0) @IsOptional() salePrice?: number;
  @IsInt() @Min(0) @IsOptional() defaultIntervalKm?: number;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsBoolean() @IsOptional() favorite?: boolean;
  @IsInt() @IsOptional() sortOrder?: number;
  @IsObject() @IsOptional() override?: Record<string, unknown>;
}
export class CreateServiceCatalogDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() description?: string;
}
export class ConfigureShopServiceDto {
  @IsInt() @IsPositive() @IsOptional() fee?: number;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsBoolean() @IsOptional() favorite?: boolean;
  @IsInt() @IsOptional() sortOrder?: number;
}
export class ChangeStatusDto {
  @IsEnum(RecordStatus) status: RecordStatus;
}
