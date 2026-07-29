import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, Suggestion } from '../database/entities';
import { SuggestionStatus } from '../common/enums';
import { CreateSuggestionDto, DecideSuggestionDto } from './dto';
import { CatalogService } from '../catalog/catalog.service';

@Injectable()
export class SuggestionsService {
  constructor(
    @InjectRepository(Suggestion) private readonly suggestions: Repository<Suggestion>,
    @InjectRepository(AuditLog) private readonly audits: Repository<AuditLog>,
    private readonly catalog: CatalogService,
  ) {}
  create(shopId: string, dto: CreateSuggestionDto) {
    return this.suggestions.save(this.suggestions.create({ shopId, ...dto }));
  }
  list(shopId?: string, status?: SuggestionStatus) {
    return this.suggestions.find({
      where: { ...(shopId ? { shopId } : {}), ...(status ? { status } : {}) },
      order: { createdAt: 'DESC' },
    });
  }
  async decide(actorId: string, id: string, dto: DecideSuggestionDto) {
    if (dto.status === SuggestionStatus.PENDING) throw new BadRequestException('تصمیم نهایی نمی‌تواند pending باشد.');
    const suggestion = await this.suggestions.findOneBy({ id });
    if (!suggestion) throw new NotFoundException('پیشنهاد یافت نشد.');
    if (suggestion.status !== SuggestionStatus.PENDING) {
      throw new BadRequestException('برای این پیشنهاد قبلاً تصمیم‌گیری شده است.');
    }

    let mappedEntityId = dto.mappedEntityId;
    if (dto.status === SuggestionStatus.APPROVED) {
      const originalDescription = typeof suggestion.payload.description === 'string'
        ? suggestion.payload.description.trim()
        : '';
      const description = dto.catalogName?.trim() || originalDescription;
      if (!description) throw new BadRequestException('نام نهایی برای ایجاد مورد کاتالوگ الزامی است.');
      if (suggestion.entityType === 'product') {
        const product = await this.catalog.createSuggestedProduct(description);
        await this.catalog.configureProduct(suggestion.shopId, actorId, product.id, { isActive: true });
        mappedEntityId = product.id;
      } else if (suggestion.entityType === 'service') {
        const service = await this.catalog.createService({ name: description, category: dto.category });
        await this.catalog.configureService(suggestion.shopId, actorId, service.id, { isActive: true });
        mappedEntityId = service.id;
      } else {
        throw new BadRequestException('نوع این پیشنهاد برای افزودن به کاتالوگ پشتیبانی نمی‌شود.');
      }
    }

    if (dto.status === SuggestionStatus.MERGED) {
      if (!mappedEntityId) throw new BadRequestException('انتخاب مورد مقصد برای ادغام الزامی است.');
      if (suggestion.entityType === 'product') {
        await this.catalog.configureProduct(suggestion.shopId, actorId, mappedEntityId, { isActive: true });
      } else if (suggestion.entityType === 'service') {
        await this.catalog.configureService(suggestion.shopId, actorId, mappedEntityId, { isActive: true });
      } else {
        throw new BadRequestException('نوع این پیشنهاد برای ادغام پشتیبانی نمی‌شود.');
      }
    }

    const before = { status: suggestion.status };
    suggestion.status = dto.status;
    suggestion.decisionNote = dto.decisionNote;
    suggestion.mappedEntityId = mappedEntityId;
    await this.suggestions.save(suggestion);
    await this.audits.save(this.audits.create({
      actorId, shopId: suggestion.shopId, action: 'suggestion.decided',
      entityType: 'suggestion', entityId: suggestion.id, before,
      after: { status: suggestion.status, mappedEntityId: suggestion.mappedEntityId },
    }));
    return suggestion;
  }
}
