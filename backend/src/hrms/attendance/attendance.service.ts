import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../security/audit/audit.service';
import { AttendanceRulesService } from './attendance-rules.service';
import { CreateAttendanceDto, CheckInDto, CheckOutDto } from './dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private rulesService: AttendanceRulesService,
  ) {}

  async checkIn(checkInDto: CheckInDto, employeeId: string, tenantId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate FIELD mode GPS requirement
    this.rulesService.validateFieldMode(checkInDto.latitude, checkInDto.longitude, checkInDto.mode);

    const existing = await this.prisma.attendance.findUnique({
      where: {
        employeeId_date_tenantId: {
          employeeId,
          date: today,
          tenantId,
        },
      },
    });

    if (existing && existing.checkInTime) {
      throw new BadRequestException('Already checked in today');
    }

    const checkInTime = new Date();
    const mode = checkInDto.mode || 'OFFICE';

    // Get employee policy
    const policy = await this.rulesService.getEmployeePolicy(employeeId, tenantId);

    const attendance = await this.prisma.attendance.upsert({
      where: {
        employeeId_date_tenantId: {
          employeeId,
          date: today,
          tenantId,
        },
      },
      update: {
        checkInTime,
        checkInLat: checkInDto.latitude,
        checkInLng: checkInDto.longitude,
        checkInAddress: checkInDto.address,
        checkInPhoto: checkInDto.photo,
        deviceId: checkInDto.deviceId,
        devicePlatform: checkInDto.devicePlatform,
        deviceInfo: checkInDto.deviceInfo ? JSON.parse(JSON.stringify(checkInDto.deviceInfo)) : null,
        mode,
        policyId: policy?.id,
      },
      create: {
        employeeId,
        tenantId,
        date: today,
        checkInTime,
        checkInLat: checkInDto.latitude,
        checkInLng: checkInDto.longitude,
        checkInAddress: checkInDto.address,
        checkInPhoto: checkInDto.photo,
        deviceId: checkInDto.deviceId,
        devicePlatform: checkInDto.devicePlatform,
        deviceInfo: checkInDto.deviceInfo ? JSON.parse(JSON.stringify(checkInDto.deviceInfo)) : null,
        mode,
        policyId: policy?.id,
        status: 'PRESENT',
      },
      include: {
        policy: true,
      },
    });

    // Create punch record
    await this.prisma.attendancePunch.create({
      data: {
        attendanceId: attendance.id,
        punchTime: checkInTime,
        punchType: 'CHECK_IN',
        latitude: checkInDto.latitude,
        longitude: checkInDto.longitude,
        address: checkInDto.address,
        photo: checkInDto.photo,
        deviceId: checkInDto.deviceId,
        devicePlatform: checkInDto.devicePlatform,
        deviceInfo: checkInDto.deviceInfo ? JSON.parse(JSON.stringify(checkInDto.deviceInfo)) : null,
        source: 'MANUAL',
      },
    });

    await this.auditService.log(AuditAction.CREATE, 'Attendance', {
      tenantId,
      userId,
      employeeId,
      entityId: attendance.id,
      newValues: { action: 'CHECK_IN', time: checkInTime, mode },
    });

    return attendance;
  }

  async checkOut(checkOutDto: CheckOutDto, employeeId: string, tenantId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.prisma.attendance.findUnique({
      where: {
        employeeId_date_tenantId: {
          employeeId,
          date: today,
          tenantId,
        },
      },
      include: {
        policy: true,
      },
    });

    if (!attendance || !attendance.checkInTime) {
      throw new BadRequestException('Please check in first');
    }

    if (attendance.checkOutTime) {
      throw new BadRequestException('Already checked out today');
    }

    const checkOutTime = new Date();
    const mode = attendance.mode || 'OFFICE';
    
    // Validate FIELD mode GPS requirement
    if (mode === 'FIELD') {
      this.rulesService.validateFieldMode(checkOutDto.latitude, checkOutDto.longitude, mode);
    }

    // Get policy and evaluate attendance
    const policy = attendance.policyId 
      ? await this.prisma.attendancePolicy.findUnique({ where: { id: attendance.policyId } })
      : await this.rulesService.getEmployeePolicy(employeeId, tenantId);

    const attendanceWithTimes = {
      ...attendance,
      checkOutTime,
    };

    const evaluation = this.rulesService.evaluateAttendanceStatus(attendanceWithTimes as any, policy);

    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime,
        checkOutLat: checkOutDto.latitude,
        checkOutLng: checkOutDto.longitude,
        checkOutAddress: checkOutDto.address,
        checkOutPhoto: checkOutDto.photo,
        totalHours: evaluation.regularHours + evaluation.overtimeHours,
        regularHours: evaluation.regularHours,
        overtimeHours: evaluation.overtimeHours,
        status: evaluation.status,
      },
      include: {
        policy: true,
      },
    });

    // Create punch record
    await this.prisma.attendancePunch.create({
      data: {
        attendanceId: attendance.id,
        punchTime: checkOutTime,
        punchType: 'CHECK_OUT',
        latitude: checkOutDto.latitude,
        longitude: checkOutDto.longitude,
        address: checkOutDto.address,
        photo: checkOutDto.photo,
        deviceId: checkOutDto.deviceId,
        devicePlatform: checkOutDto.devicePlatform,
        deviceInfo: checkOutDto.deviceInfo ? JSON.parse(JSON.stringify(checkOutDto.deviceInfo)) : null,
        source: 'MANUAL',
      },
    });

    await this.auditService.log(AuditAction.UPDATE, 'Attendance', {
      tenantId,
      userId,
      employeeId,
      entityId: attendance.id,
      newValues: { action: 'CHECK_OUT', time: checkOutTime, status: evaluation.status },
    });

    return updated;
  }

  async findAll(tenantId: string, employeeId?: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };
    
    if (employeeId) {
      where.employeeId = employeeId;
    }
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }

    return attendance;
  }

  async getCalendar(employeeId: string, tenantId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        tenantId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return attendances;
  }
}

