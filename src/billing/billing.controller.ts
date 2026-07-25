import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.decorators';
import { AuthUser } from '../auth/auth.types';
import { BillingService } from './billing.service';

@ApiTags('billing')
@Controller('invoices')
export class BillingController {
  constructor(private readonly billing: BillingService) {}
  @Get() list(@CurrentUser() user: AuthUser) { return this.billing.list(user.shopId!); }
  @Get(':id') get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.billing.get(user.shopId!, id);
  }
}
