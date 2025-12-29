import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DoctorService } from './doctor.service';
import { CreateDoctorDto, UpdateDoctorDto, ApproveDoctorDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, DoctorStatus } from '@prisma/client';

@ApiTags('Doctors')
@Controller('doctors')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post()
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create doctor (employee can propose)' })
  create(
    @Body() createDto: CreateDoctorDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    const proposedBy = user.role === Role.EMPLOYEE ? user.employeeId : undefined;
    return this.doctorService.create(createDto, tenantId, proposedBy, user.id);
  }

  @Get()
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get all doctors' })
  @ApiQuery({ name: 'status', required: false, enum: DoctorStatus })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('status') status?: DoctorStatus,
    @Query('search') search?: string,
  ) {
    return this.doctorService.findAll(tenantId, status, search);
  }

  @Get(':id')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get doctor by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.doctorService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update doctor' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDoctorDto,
    @TenantId() tenantId: string,
  ) {
    return this.doctorService.update(id, updateDto, tenantId);
  }

  @Patch(':id/approve')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Approve/Reject doctor' })
  approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveDoctorDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.doctorService.approve(id, approveDto, tenantId, user.id);
  }

  @Delete(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete doctor' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.doctorService.remove(id, tenantId);
  }
}

