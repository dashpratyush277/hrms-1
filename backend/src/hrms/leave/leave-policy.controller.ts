import { Controller, Get, Post, Body, Param, UseGuards, Patch, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LeavePolicyService } from './leave-policy.service';
import { CreateLeavePolicyDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Leave Policies')
@Controller('leave/policies')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class LeavePolicyController {
  constructor(private readonly leavePolicyService: LeavePolicyService) {}

  @Post()
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create leave policy' })
  create(
    @Body() createDto: CreateLeavePolicyDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.leavePolicyService.create(createDto, tenantId, user.id);
  }

  @Get()
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get all leave policies' })
  @ApiQuery({ name: 'leaveTypeId', required: false })
  findAll(@TenantId() tenantId: string, @Query('leaveTypeId') leaveTypeId?: string) {
    return this.leavePolicyService.findAll(tenantId, leaveTypeId);
  }

  @Get(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get leave policy by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.leavePolicyService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update leave policy' })
  update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateLeavePolicyDto>,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.leavePolicyService.update(id, updateDto, tenantId, user.id);
  }

  @Delete(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete leave policy' })
  delete(@Param('id') id: string, @TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.leavePolicyService.delete(id, tenantId, user.id);
  }
}

