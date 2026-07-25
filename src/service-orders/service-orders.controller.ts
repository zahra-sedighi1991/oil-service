import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.types';
import { CancelOrderDto, CompleteOrderDto, CreateOrderDto } from './dto';
import { ServiceOrdersService } from './service-orders.service';

@ApiTags('service-orders')
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly orders: ServiceOrdersService) {}
  @Get()
  list(@CurrentUser() user: AuthUser, @Query('vehicleId') vehicleId?: string) {
    return this.orders.list(user.shopId!, vehicleId);
  }
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.orders.get(user.shopId!, id); }
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.createDraft(user.shopId!, user.sub, dto);
  }
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateOrderDto) {
    return this.orders.updateDraft(user.shopId!, user.sub, id, dto);
  }
  @Post(':id/complete')
  complete(
    @CurrentUser() user: AuthUser, @Param('id') id: string,
    @Headers('idempotency-key') key: string, @Body() dto: CompleteOrderDto,
  ) { return this.orders.complete(user.shopId!, user.sub, id, key, dto); }
  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.orders.cancel(user.shopId!, user.sub, id, dto);
  }
}
