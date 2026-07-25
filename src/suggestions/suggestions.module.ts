import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Suggestion } from '../database/entities';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';
@Module({
  imports: [TypeOrmModule.forFeature([Suggestion, AuditLog])],
  controllers: [SuggestionsController],
  providers: [SuggestionsService],
})
export class SuggestionsModule {}
