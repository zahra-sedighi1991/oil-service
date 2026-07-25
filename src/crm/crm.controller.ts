import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.types';
import { CrmService } from './crm.service';
import { CreateCustomerDto, CreateVehicleDto, UpdateCustomerDto } from './dto';

@ApiTags('crm')
@Controller()
export class CrmController {
  constructor(private readonly crm: CrmService) {}
  @Get('customers')
  customers(@CurrentUser() user: AuthUser, @Query('mobile') mobile?: string, @Query('search') search?: string) {
    return this.crm.listCustomers(user.shopId!, mobile, search);
  }
  @Get('customers/:id')
  customer(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.crm.getCustomer(user.shopId!, id); }
  @Post('customers')
  createCustomer(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) { return this.crm.createCustomer(user.shopId!, dto); }
  @Patch('customers/:id')
  updateCustomer(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.crm.updateCustomer(user.shopId!, user.sub, id, dto);
  }
  @Get('vehicles')
  vehicles(@CurrentUser() user: AuthUser, @Query('plate') plate?: string) { return this.crm.listVehicles(user.shopId!, plate); }
  @Post('vehicles')
  createVehicle(@CurrentUser() user: AuthUser, @Body() dto: CreateVehicleDto) { return this.crm.createVehicle(user.shopId!, dto); }
  @Patch('vehicles/:id/owner')
  transfer(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('ownerCustomerId') ownerId: string) {
    return this.crm.transferOwnership(user.shopId!, user.sub, id, ownerId);
  }
}
