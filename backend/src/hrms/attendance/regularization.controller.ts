import { Controller, Get, Post, Body, Param, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RegularizationService } from './regularization.service';
import { CreateRegularizationDto, ApproveRegularizationDto, RejectRegularizationDto } from './dto/create-regularization.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, RegularizationStatus } from '@prisma/client';

@ApiTags('Regularization')
@Controller('attendance/regularization')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class RegularizationController {
  constructor(private readonly regularizationService: RegularizationService) {}

  @Post()
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Create regularization request' })
  create(
    @Body() createDto: CreateRegularizationDto,
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    const employeeId = user.employeeId;
    if (!employeeId) {
      throw new BadRequestException('Employee profile not found');
    }
    return this.regularizationService.create(createDto, employeeId, tenantId, user.id);
  }

  @Get()
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get regularization requests' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: RegularizationStatus })
  findAll(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: RegularizationStatus,
    @CurrentUser() user?: any,
  ) {
    // Employees can only see their own requests
    const empId = user?.role === Role.EMPLOYEE ? user.employeeId : employeeId;
    return this.regularizationService.findAll(tenantId, empId, status);
  }

  @Get(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get regularization request by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.regularizationService.findOne(id, tenantId);
  }

  @Post(':id/approve')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Approve regularization request' })
  approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveRegularizationDto,
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    return this.regularizationService.approve(id, approveDto, user.id, tenantId, user.id, user.role);
  }

  @Post(':id/reject')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Reject regularization request' })
  reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectRegularizationDto,
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    return this.regularizationService.reject(id, rejectDto, user.id, tenantId, user.id, user.role);
  }

  @Post(':id/cancel')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Cancel regularization request' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    const employeeId = user.employeeId;
    if (!employeeId) {
      throw new BadRequestException('Employee profile not found');
    }
    return this.regularizationService.cancel(id, employeeId, tenantId, user.id);
  }
}

