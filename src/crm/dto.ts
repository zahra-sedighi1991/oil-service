import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

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
  @IsString() brandId: string;
  @IsString() modelId: string;
  @IsString() @IsOptional() plate?: string;
  @IsString() @IsOptional() temporaryIdentifier?: string;
  @IsInt() @Min(1300) @Max(2200) @IsOptional() year?: number;
  @IsInt() @Min(0) @IsOptional() lastOdometer?: number;
}
