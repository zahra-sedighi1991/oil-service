import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.types';
import { PublicBookService } from './public-book.service';

@ApiTags('public-service-book')
@Controller()
export class PublicBookController {
  constructor(private readonly book: PublicBookService) {}
  @Public() @Get('public/v1/service-book/:token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  view(@Param('token') token: string) { return this.book.view(token); }
  @Post('vehicles/:vehicleId/public-link')
  regenerate(@CurrentUser() user: AuthUser, @Param('vehicleId') vehicleId: string) {
    return this.book.regenerate(user.shopId!, user.sub, vehicleId);
  }
  @Delete('vehicles/:vehicleId/public-link')
  revoke(@CurrentUser() user: AuthUser, @Param('vehicleId') vehicleId: string) {
    return this.book.revoke(user.shopId!, user.sub, vehicleId);
  }
}
