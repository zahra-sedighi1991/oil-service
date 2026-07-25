import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, Suggestion } from '../database/entities';
import { SuggestionStatus } from '../common/enums';
import { CreateSuggestionDto, DecideSuggestionDto } from './dto';

@Injectable()
export class SuggestionsService {
  constructor(
    @InjectRepository(Suggestion) private readonly suggestions: Repository<Suggestion>,
    @InjectRepository(AuditLog) private readonly audits: Repository<AuditLog>,
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
    const before = { status: suggestion.status };
    Object.assign(suggestion, dto);
    await this.suggestions.save(suggestion);
    await this.audits.save(this.audits.create({
      actorId, shopId: suggestion.shopId, action: 'suggestion.decided',
      entityType: 'suggestion', entityId: suggestion.id, before,
      after: { status: suggestion.status, mappedEntityId: suggestion.mappedEntityId },
    }));
    return suggestion;
  }
}
