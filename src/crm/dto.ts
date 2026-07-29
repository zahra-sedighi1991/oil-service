import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateCustomerDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() mobile: string;
  @IsString() @IsOptional() note?: string;
}
export class UpdateCustomerDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() mobile?: string;
  @IsString() @IsOptional() note?: string;
}
export class CreateVehicleDto {
  @IsString() ownerCustomerId: string;
  @IsString() @IsOptional() brandId?: string;
  @IsString() modelId: string;
  @IsString() @IsOptional() plate?: string;
  @IsInt() @Min(0) @IsOptional() lastOdometer?: number;
}
