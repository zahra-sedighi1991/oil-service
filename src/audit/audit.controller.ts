import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.types';
import { UserRole } from '../common/enums';
import { AuditLog } from '../database/entities';

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
  admin(@Query('shopId') shopId?: string, @Query('action') action?: string) {
    return this.audits.find({
      where: { ...(shopId ? { shopId } : {}), ...(action ? { action } : {}) },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }
}
