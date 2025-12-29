import { Controller, Get, Post, Body, Param, UseGuards, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VisitService } from './visit.service';
import { CreateVisitDto, EndVisitDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Visits')
@Controller('visits')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post('start')
  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @ApiOperation({ summary: 'Start visit' })
  start(
    @Body() createDto: CreateVisitDto,
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    const employeeId = user.employeeId;
    if (!employeeId) {
      throw new Error('Employee profile not found');
    }
    return this.visitService.start(createDto, employeeId, tenantId, user.id);
  }

  @Post(':id/end')
  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @ApiOperation({ summary: 'End visit' })
  end(
    @Param('id') id: string,
    @Body() endDto: EndVisitDto,
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    const employeeId = user.employeeId;
    if (!employeeId) {
      throw new Error('Employee profile not found');
    }
    return this.visitService.end(id, endDto, employeeId, tenantId, user.id);
  }

  @Get()
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get all visits' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAll(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    const empId = user?.role === Role.EMPLOYEE ? user.employeeId : employeeId;
    return this.visitService.findAll(
      tenantId,
      empId,
      doctorId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get visit by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.visitService.findOne(id, tenantId);
  }
}

