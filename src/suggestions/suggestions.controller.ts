import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { AuthUser } from '../auth/auth.types';
import { SuggestionStatus, UserRole } from '../common/enums';
import { CreateSuggestionDto, DecideSuggestionDto } from './dto';
import { SuggestionsService } from './suggestions.service';

@ApiTags('suggestions')
@Controller()
export class SuggestionsController {
  constructor(private readonly service: SuggestionsService) {}
  @Post('suggestions')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSuggestionDto) {
    return this.service.create(user.shopId!, dto);
  }
  @Get('suggestions')
  mine(@CurrentUser() user: AuthUser, @Query('status') status?: SuggestionStatus) {
    return this.service.list(user.shopId!, status);
  }
  @Get('admin/suggestions') @Roles(UserRole.SUPER_ADMIN)
  all(@Query('status') status?: SuggestionStatus) { return this.service.list(undefined, status); }
  @Patch('admin/suggestions/:id') @Roles(UserRole.SUPER_ADMIN)
  decide(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: DecideSuggestionDto) {
    return this.service.decide(user.sub, id, dto);
  }
}
