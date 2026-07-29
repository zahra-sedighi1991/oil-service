import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Suggestion } from '../database/entities';
import { CatalogModule } from '../catalog/catalog.module';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';
@Module({
  imports: [TypeOrmModule.forFeature([Suggestion, AuditLog]), CatalogModule],
  controllers: [SuggestionsController],
  providers: [SuggestionsService],
})
export class SuggestionsModule {}
