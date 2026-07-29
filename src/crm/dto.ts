import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateCustomerDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsNotEmpty() mobile: string;
  @IsIn(['male', 'female']) @IsOptional() gender?: 'male' | 'female';
  @IsString() @IsOptional() note?: string;
}
export class UpdateCustomerDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() mobile?: string;
  @IsIn(['male', 'female']) @IsOptional() gender?: 'male' | 'female';
  @IsString() @IsOptional() note?: string;
}
export class CreateVehicleDto {
  @IsString() ownerCustomerId: string;
  @IsString() @IsOptional() brandId?: string;
  @IsString() modelId: string;
  @IsString() @IsOptional() plate?: string;
  @IsInt() @Min(0) @IsOptional() lastOdometer?: number;
}
