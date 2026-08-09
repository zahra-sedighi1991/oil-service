import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.types';
import { BillingService } from './billing.service';

@ApiTags('billing')
@Controller('invoices')
export class BillingController {
  constructor(private readonly billing: BillingService) {}
  @Get() list(@CurrentUser() user: AuthUser, @Query('search') search?: string) {
    return this.billing.list(user.shopId!, search);
  }
  @Get(':id') get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.billing.get(user.shopId!, id);
  }
}
