import { Body, Controller, Get, NotFoundException, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.types';
import { ShopStatus, UserRole } from '../common/enums';
import { AuditLog, Shop } from '../database/entities';
import { UpdateShopDto, UpdateShopStatusDto, UpdateShopUserStatusDto } from './dto';
import { AdminShopsService } from './admin-shops.service';

@ApiTags('shop')
@Controller('shop')
export class ShopsController {
  constructor(
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    @InjectRepository(AuditLog) private readonly audits: Repository<AuditLog>,
  ) {}

  @Get('profile')
  async get(@CurrentUser() user: AuthUser) {
    const shop = await this.shops.findOneBy({ id: user.shopId! });
    if (!shop) throw new NotFoundException('فروشگاه یافت نشد.');
    return shop;
  }

  @Patch('profile')
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateShopDto) {
    const shop = await this.shops.findOneBy({ id: user.shopId! });
    if (!shop) throw new NotFoundException('فروشگاه یافت نشد.');
    const before = { ...shop };
    Object.assign(shop, dto);
    const result = await this.shops.save(shop);
    await this.audits.save(this.audits.create({
      actorId: user.sub,
      shopId: shop.id,
      action: 'shop.updated',
      entityType: 'shop',
      entityId: shop.id,
      before,
      after: { ...dto },
    }));
    return result;
  }
}

@ApiTags('admin-shops')
@Controller('admin/shops')
@Roles(UserRole.SUPER_ADMIN)
export class AdminShopsController {
  constructor(
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    @InjectRepository(AuditLog) private readonly audits: Repository<AuditLog>,
    private readonly adminShops: AdminShopsService,
  ) {}

  @Get('overview')
  overview() { return this.adminShops.overview(); }

  @Get()
  list(@Query('search') search?: string, @Query('status') status?: ShopStatus) {
    return this.adminShops.list(search, status);
  }

  @Get(':id')
  get(@Param('id') id: string) { return this.adminShops.detail(id); }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateShopDto) {
    return this.adminShops.update(id, user.sub, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateShopStatusDto,
  ) {
    const shop = await this.shops.findOneBy({ id });
    if (!shop) throw new NotFoundException('فروشگاه یافت نشد.');
    const previousStatus = shop.status;
    shop.status = dto.status;
    const result = await this.shops.save(shop);
    await this.audits.save(this.audits.create({
      actorId: user.sub,
      shopId: shop.id,
      action: 'shop.status_changed',
      entityType: 'shop',
      entityId: shop.id,
      before: { status: previousStatus },
      after: { status: shop.status },
    }));
    return result;
  }

  @Patch(':id/users/:userId/status')
  updateUserStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateShopUserStatusDto,
  ) {
    return this.adminShops.updateUserStatus(id, userId, user.sub, dto.status);
  }
}
