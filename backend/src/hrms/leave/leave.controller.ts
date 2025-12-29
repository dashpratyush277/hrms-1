import { Controller, Get, Post, Body, Param, UseGuards, Query, Patch, BadRequestException, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { CreateLeaveApplicationDto, UpdateLeaveApplicationDto, ApproveLeaveDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, LeaveStatus } from '@prisma/client';

@ApiTags('Leave')
@Controller('leave')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('apply')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Apply for leave' })
  apply(
    @Body() createDto: CreateLeaveApplicationDto,
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    const employeeId = user.employeeId;
    if (!employeeId) {
      throw new BadRequestException('Employee profile not found. Please link your user account to an employee profile.');
    }
    return this.leaveService.apply(createDto, employeeId, tenantId, user.id);
  }

  @Get()
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get leave applications' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: LeaveStatus })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: LeaveStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    const empId = user?.role === Role.EMPLOYEE ? user.employeeId : employeeId;
    return this.leaveService.findAll(
      tenantId,
      empId,
      status,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('team')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get team leave applications' })
  @ApiQuery({ name: 'status', required: false, enum: LeaveStatus })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getTeamLeaves(
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
    @Query('status') status?: LeaveStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('Manager profile not found');
    }
    return this.leaveService.getTeamLeaves(
      user.employeeId,
      tenantId,
      status,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get leave application by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.leaveService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Update leave application (before approval)' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLeaveApplicationDto,
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('Employee profile not found');
    }
    return this.leaveService.update(id, updateDto, user.employeeId, tenantId, user.id);
  }

  @Delete(':id')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Cancel leave application' })
  cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    if (!user.employeeId) {
      throw new BadRequestException('Employee profile not found');
    }
    return this.leaveService.cancel(id, reason, user.employeeId, tenantId, user.id);
  }

  @Get('balances')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get leave balances' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'employeeId', required: false })
  getBalances(
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
    @Query('year') year?: string,
    @Query('employeeId') employeeIdParam?: string,
  ) {
    // Allow admins to view any employee's balance, employees can only see their own
    const employeeId = user.role === Role.EMPLOYEE ? user.employeeId : (employeeIdParam || user.employeeId);
    if (!employeeId) {
      throw new BadRequestException('Employee profile not found. Please specify an employeeId or link your account to an employee profile.');
    }
    return this.leaveService.getBalances(employeeId, tenantId, year ? parseInt(year) : undefined);
  }

  @Patch(':id/approve')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Approve/Reject leave' })
  approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveLeaveDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.leaveService.approve(id, approveDto, tenantId, user.id);
  }
}

