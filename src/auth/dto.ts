import { IsMobilePhone, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class RequestOtpDto {
  @IsString() @IsNotEmpty() mobile: string;
}

export class VerifyOtpDto {
  @IsString() @IsNotEmpty() mobile: string;
  @IsString() @Length(4, 8) code: string;
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() shopName?: string;
  @IsString() @IsOptional() city?: string;
}
