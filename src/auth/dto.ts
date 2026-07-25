import { IsNotEmpty, IsOptional, IsString, Length, MinLength } from 'class-validator';

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

export class PasswordLoginDto {
  @IsString() @IsNotEmpty() mobile: string;
  @IsString() @MinLength(6) password: string;
}

export class PasswordRegisterDto extends PasswordLoginDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() shopName: string;
  @IsString() @IsNotEmpty() city: string;
}
