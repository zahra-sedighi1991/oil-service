import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { SuggestionStatus } from '../common/enums';
export class CreateSuggestionDto {
  @IsString() @IsNotEmpty() entityType: string;
  @IsObject() payload: Record<string, unknown>;
}
export class DecideSuggestionDto {
  @IsEnum(SuggestionStatus) status: SuggestionStatus;
  @IsString() @IsNotEmpty() decisionNote: string;
  @IsString() @IsOptional() mappedEntityId?: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() catalogName?: string;
  @IsString() @IsOptional() productTypeId?: string;
  @IsObject() @IsOptional() attributes?: Record<string, unknown>;
  @IsArray() @IsString({ each: true }) @IsOptional() vehicleModelIds?: string[];
}
