import { Type } from 'class-transformer';
import {
  IsArray, IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional,
  IsPositive, IsString, Min, ValidateNested,
} from 'class-validator';

export class ProductLineDto {
  @IsString() @IsOptional() productId?: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @IsPositive() quantity: number;
  @IsInt() @Min(0) unitPrice: number;
  @IsInt() @Min(0) @IsOptional() intervalKm?: number;
  @IsInt() @Min(0) @IsOptional() intervalMonths?: number;
}
export class LaborLineDto {
  @IsString() @IsOptional() serviceId?: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @IsPositive() quantity: number;
  @IsInt() @Min(0) unitFee: number;
}
export class CreateOrderDto {
  @IsString() customerId: string;
  @IsString() vehicleId: string;
  @IsDateString() @IsOptional() serviceDate?: string;
  @IsInt() @Min(0) odometer: number;
  @IsString() @IsOptional() note?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ProductLineDto)
  @IsOptional() products?: ProductLineDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => LaborLineDto)
  @IsOptional() services?: LaborLineDto[];
}
export class CompleteOrderDto {
  @IsInt() @Min(0) @IsOptional() discountAmount?: number;
}
export class CancelOrderDto {
  @IsString() @IsNotEmpty() reason: string;
}

export const REMINDER_STATUSES = [
  'sms_sent', 'not_sent', 'later', 'no_answer', 'called', 'appointment', 'declined',
] as const;

export type ReminderStatus = typeof REMINDER_STATUSES[number];

export class UpdateReminderStatusDto {
  @IsIn(REMINDER_STATUSES)
  status: ReminderStatus;
}
