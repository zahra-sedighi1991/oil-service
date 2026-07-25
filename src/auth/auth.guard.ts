import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { IS_PUBLIC_KEY, ROLES_KEY } from './auth.decorators';
import type { AuthUser } from './auth.types';
import { ShopStatus, UserRole } from '../common/enums';
import { Shop } from '../database/entities';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])) return true;

    const request = context.switchToHttp().getRequest<Request & { user: AuthUser }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('توکن دسترسی ارسال نشده است.');

    try {
      request.user = await this.jwt.verifyAsync<AuthUser>(token);
    } catch {
      throw new UnauthorizedException('توکن دسترسی نامعتبر یا منقضی است.');
    }

    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length && !roles.includes(request.user.role)) {
      throw new ForbiddenException('دسترسی کافی برای این عملیات ندارید.');
    }
    if (request.user.role !== UserRole.SUPER_ADMIN && !request.user.shopId) {
      throw new ForbiddenException('فضای کاری کاربر مشخص نیست.');
    }
    if (request.user.role !== UserRole.SUPER_ADMIN) {
      const shop = await this.dataSource.getRepository(Shop).findOneBy({ id: request.user.shopId! });
      if (!shop || [ShopStatus.SUSPENDED, ShopStatus.CLOSED].includes(shop.status)) {
        throw new ForbiddenException('فروشگاه غیرفعال یا تعلیق شده است.');
      }
    }
    return true;
  }
}
