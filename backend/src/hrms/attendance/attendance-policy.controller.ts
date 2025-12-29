import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendancePolicyService } from './attendance-policy.service';
import { CreateAttendancePolicyDto } from './dto/create-policy.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Attendance Policies')
@Controller('attendance/policies')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class AttendancePolicyController {
  constructor(private readonly policyService: AttendancePolicyService) {}

  @Post()
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create attendance policy' })
  create(
    @Body() createDto: CreateAttendancePolicyDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.policyService.create(createDto, tenantId, user.id);
  }

  @Get()
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get all attendance policies' })
  findAll(@TenantId() tenantId: string) {
    return this.policyService.findAll(tenantId);
  }

  @Get(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get attendance policy by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.policyService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update attendance policy' })
  update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateAttendancePolicyDto>,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.policyService.update(id, updateDto, tenantId, user.id);
  }

  @Delete(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete attendance policy' })
  remove(@Param('id') id: string, @TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.policyService.delete(id, tenantId, user.id);
  }

  @Post(':id/assign/:employeeId')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Assign policy to employee' })
  assignToEmployee(
    @Param('id') policyId: string,
    @Param('employeeId') employeeId: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.policyService.assignToEmployee(employeeId, policyId, tenantId, user.id);
  }
}

