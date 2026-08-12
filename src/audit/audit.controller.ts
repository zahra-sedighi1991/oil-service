import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.types';
import { UserRole } from '../common/enums';
import { AuditLog, User } from '../database/entities';

@ApiTags('audit')
@Controller()
export class AuditController {
  constructor(@InjectRepository(AuditLog) private readonly audits: Repository<AuditLog>) {}

  @Get('audit-logs')
  @Roles(UserRole.SHOP_OWNER)
  own(@CurrentUser() user: AuthUser, @Query('action') action?: string) {
    return this.audits.find({
      where: { shopId: user.shopId!, ...(action ? { action } : {}) },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  @Get('admin/audit-logs')
  @Roles(UserRole.SUPER_ADMIN)
  async admin(@Query('shopId') shopId?: string, @Query('action') action?: string) {
    const query = this.audits.createQueryBuilder('audit')
      .select([
        'audit.id', 'audit.actorId', 'audit.shopId', 'audit.action',
        'audit.entityType', 'audit.entityId', 'audit.createdAt',
      ])
      .leftJoin(User, 'actor', 'actor.id::text = audit."actorId"')
      .addSelect('actor.name', 'actorName')
      .orderBy('audit."createdAt"', 'DESC')
      .take(200);
    if (shopId) query.andWhere('audit."shopId" = :shopId', { shopId });
    if (action) query.andWhere('audit.action = :action', { action });
    const { entities, raw } = await query.getRawAndEntities();
    const actorNames = new Map(raw.map((row) => [row.audit_id, row.actorName ?? null]));
    return entities.map((item) => ({ ...item, actorName: actorNames.get(item.id) ?? null }));
  }
}
