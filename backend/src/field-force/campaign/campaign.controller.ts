import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CampaignService } from './campaign.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create campaign' })
  create(
    @Body() createDto: any,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.campaignService.create(createDto, tenantId, user.id);
  }

  @Get()
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get all campaigns' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(@TenantId() tenantId: string, @Query('isActive') isActive?: string) {
    return this.campaignService.findAll(tenantId, isActive === 'true' ? true : isActive === 'false' ? false : undefined);
  }

  @Get(':id')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get campaign by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.campaignService.findOne(id, tenantId);
  }
}

