import { Controller, Get, Post, Body, Param, UseGuards, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RoutePlanService } from './route-plan.service';
import { CreateRoutePlanDto, UpdateRouteItemDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Route Plans')
@Controller('route-plans')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class RoutePlanController {
  constructor(private readonly routePlanService: RoutePlanService) {}

  @Post()
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create route plan' })
  create(
    @Body() createDto: CreateRoutePlanDto & { employeeId: string },
    @TenantId() tenantId: string,
  ) {
    return this.routePlanService.create(createDto, createDto.employeeId, tenantId);
  }

  @Get()
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get all route plans' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    const empId = user?.role === Role.EMPLOYEE ? user.employeeId : employeeId;
    return this.routePlanService.findAll(
      tenantId,
      empId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get route plan by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.routePlanService.findOne(id, tenantId);
  }

  @Patch(':routePlanId/items/:itemId')
  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @ApiOperation({ summary: 'Update route item' })
  updateRouteItem(
    @Param('routePlanId') routePlanId: string,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateRouteItemDto,
    @TenantId() tenantId: string,
  ) {
    return this.routePlanService.updateRouteItem(routePlanId, itemId, updateDto, tenantId);
  }
}

