import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Check in' })
  checkIn(
    @Body() checkInDto: CheckInDto,
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    const employeeId = user.employeeId;
    if (!employeeId) {
      throw new BadRequestException('Employee profile not found. Please link your user account to an employee profile.');
    }
    return this.attendanceService.checkIn(checkInDto, employeeId, tenantId, user.id);
  }

  @Post('check-out')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Check out' })
  checkOut(
    @Body() checkOutDto: CheckOutDto,
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    const employeeId = user.employeeId;
    if (!employeeId) {
      throw new BadRequestException('Employee profile not found. Please link your user account to an employee profile.');
    }
    return this.attendanceService.checkOut(checkOutDto, employeeId, tenantId, user.id);
  }

  @Get()
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get attendance records' })
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
    // Employees can only see their own attendance
    const empId = user?.role === Role.EMPLOYEE ? user.employeeId : employeeId;
    return this.attendanceService.findAll(
      tenantId,
      empId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('calendar')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN)
  @ApiOperation({ summary: 'Get attendance calendar' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  getCalendar(
    @Query('year') year: string,
    @Query('month') month: string,
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ) {
    const employeeId = user.employeeId;
    if (!employeeId) {
      throw new BadRequestException('Employee profile not found. Please link your user account to an employee profile.');
    }
    return this.attendanceService.getCalendar(
      employeeId,
      tenantId,
      parseInt(year),
      parseInt(month),
    );
  }

  @Get(':id')
  @Roles(Role.HR_ADMIN, Role.TENANT_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get attendance by ID' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.attendanceService.findOne(id, tenantId);
  }
}

