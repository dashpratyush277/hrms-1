import { Controller, Get, Post, Body, Param, UseGuards, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeaveTypeService } from './leave-type.service';
import { CreateLeaveTypeDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Leave Types')
@Controller('leave/types')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class LeaveTypeController {
  constructor(private readonly leaveTypeService: LeaveTypeService) {}

  @Post()
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create leave type' })
  create(
    @Body() createDto: CreateLeaveTypeDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.leaveTypeService.create(createDto, tenantId, user.id);
  }

  @Get()
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get all leave types' })
  findAll(@TenantId() tenantId: string) {
    return this.leaveTypeService.findAll(tenantId);
  }

  @Get(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get leave type by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.leaveTypeService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update leave type' })
  update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateLeaveTypeDto>,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.leaveTypeService.update(id, updateDto, tenantId, user.id);
  }

  @Delete(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete leave type' })
  delete(@Param('id') id: string, @TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.leaveTypeService.delete(id, tenantId, user.id);
  }
}

