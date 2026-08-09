import { IsEnum, IsIn, IsOptional, IsString, IsTimeZone } from 'class-validator';
import { ShopStatus } from '../common/enums';

export class UpdateShopDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() ownerName?: string;
  @IsString() @IsOptional() publicPhone?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() address?: string;
  @IsIn(['TOMAN', 'IRR']) @IsOptional() currency?: string;
  @IsTimeZone({ message: 'منطقه زمانی معتبر نیست.' }) @IsOptional() timezone?: string;
  @IsString() @IsOptional() invoiceNumberTemplate?: string;
}

export class UpdateShopStatusDto {
  @IsEnum(ShopStatus) status: ShopStatus;
}
