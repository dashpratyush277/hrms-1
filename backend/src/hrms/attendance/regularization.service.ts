import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../security/audit/audit.service';
import { CreateRegularizationDto, ApproveRegularizationDto, RejectRegularizationDto } from './dto/create-regularization.dto';
import { RegularizationStatus, RegularizationType, AuditAction, Role } from '@prisma/client';

@Injectable()
export class RegularizationService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createDto: CreateRegularizationDto, employeeId: string, tenantId: string, userId: string) {
    // Verify attendance exists and belongs to employee
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        id: createDto.attendanceId,
        employeeId,
        tenantId,
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    // Check if regularization already exists
    const existing = await this.prisma.regularizationRequest.findUnique({
      where: { attendanceId: createDto.attendanceId },
    });

    if (existing) {
      throw new BadRequestException('Regularization request already exists for this attendance');
    }

    // Determine initial approver (reporting manager)
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: { reportingManager: true },
    });

    const currentApproverId = employee?.reportingManagerId || null;

    const regularization = await this.prisma.regularizationRequest.create({
      data: {
        attendanceId: createDto.attendanceId,
        employeeId,
        tenantId,
        date: attendance.date,
        type: createDto.type,
        requestedCheckIn: createDto.requestedCheckIn ? new Date(createDto.requestedCheckIn) : null,
        requestedCheckOut: createDto.requestedCheckOut ? new Date(createDto.requestedCheckOut) : null,
        requestedStatus: createDto.requestedStatus,
        reason: createDto.reason,
        attachmentUrl: createDto.attachmentUrl,
        status: RegularizationStatus.PENDING,
        currentApproverId,
      },
      include: {
        attendance: true,
        currentApprover: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    await this.auditService.log(AuditAction.CREATE, 'RegularizationRequest', {
      tenantId,
      userId,
      employeeId,
      entityId: regularization.id,
      newValues: regularization,
    });

    return regularization;
  }

  async findAll(tenantId: string, employeeId?: string, status?: RegularizationStatus) {
    const where: any = { tenantId };
    
    if (employeeId) {
      where.employeeId = employeeId;
    }
    
    if (status) {
      where.status = status;
    }

    return this.prisma.regularizationRequest.findMany({
      where,
      include: {
        attendance: {
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
        },
        currentApprover: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const regularization = await this.prisma.regularizationRequest.findFirst({
      where: { id, tenantId },
      include: {
        attendance: {
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
        },
        currentApprover: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    if (!regularization) {
      throw new NotFoundException('Regularization request not found');
    }

    return regularization;
  }

  async approve(
    id: string,
    approveDto: ApproveRegularizationDto,
    approverId: string,
    tenantId: string,
    userId: string,
    userRole: Role,
  ) {
    const regularization = await this.findOne(id, tenantId);

    if (regularization.status !== RegularizationStatus.PENDING) {
      throw new BadRequestException(`Cannot approve request with status: ${regularization.status}`);
    }

    // Check if user is authorized to approve
    const approver = await this.prisma.employee.findFirst({
      where: { userId: approverId, tenantId },
    });

    if (!approver) {
      throw new NotFoundException('Approver employee not found');
    }

    // Check authorization: Manager can approve their direct reports, HR_ADMIN can approve all
    if (userRole === Role.MANAGER) {
      const employee = await this.prisma.employee.findFirst({
        where: { id: regularization.employeeId, reportingManagerId: approver.id },
      });

      if (!employee) {
        throw new ForbiddenException('You can only approve regularization requests for your direct reports');
      }
    } else if (userRole !== Role.HR_ADMIN && userRole !== Role.TENANT_ADMIN) {
      throw new ForbiddenException('You are not authorized to approve regularization requests');
    }

    // Update attendance record
    const attendanceUpdate: any = {
      isRegularized: true,
    };

    if (regularization.requestedCheckIn) {
      attendanceUpdate.checkInTime = regularization.requestedCheckIn;
    }

    if (regularization.requestedCheckOut) {
      attendanceUpdate.checkOutTime = regularization.requestedCheckOut;
    }

    if (regularization.requestedStatus) {
      attendanceUpdate.status = regularization.requestedStatus;
    }

    // Recalculate hours if times changed
    if (attendanceUpdate.checkInTime && attendanceUpdate.checkOutTime) {
      const totalHours = (attendanceUpdate.checkOutTime.getTime() - attendanceUpdate.checkInTime.getTime()) / (1000 * 60 * 60);
      attendanceUpdate.totalHours = totalHours;
    }

    await this.prisma.attendance.update({
      where: { id: regularization.attendanceId },
      data: attendanceUpdate,
    });

    // Update regularization request
    const updated = await this.prisma.regularizationRequest.update({
      where: { id },
      data: {
        status: RegularizationStatus.APPROVED,
        approvedBy: approver.id,
        approvedAt: new Date(),
        comments: approveDto.comments,
        currentApproverId: null,
      },
      include: {
        attendance: true,
      },
    });

    await this.auditService.log(AuditAction.APPROVE, 'RegularizationRequest', {
      tenantId,
      userId,
      employeeId: regularization.employeeId,
      entityId: id,
      newValues: updated,
    });

    return updated;
  }

  async reject(
    id: string,
    rejectDto: RejectRegularizationDto,
    rejectorId: string,
    tenantId: string,
    userId: string,
    userRole: Role,
  ) {
    const regularization = await this.findOne(id, tenantId);

    if (regularization.status !== RegularizationStatus.PENDING) {
      throw new BadRequestException(`Cannot reject request with status: ${regularization.status}`);
    }

    // Check authorization
    const rejector = await this.prisma.employee.findFirst({
      where: { userId: rejectorId, tenantId },
    });

    if (!rejector) {
      throw new NotFoundException('Rejector employee not found');
    }

    if (userRole === Role.MANAGER) {
      const employee = await this.prisma.employee.findFirst({
        where: { id: regularization.employeeId, reportingManagerId: rejector.id },
      });

      if (!employee) {
        throw new ForbiddenException('You can only reject regularization requests for your direct reports');
      }
    } else if (userRole !== Role.HR_ADMIN && userRole !== Role.TENANT_ADMIN) {
      throw new ForbiddenException('You are not authorized to reject regularization requests');
    }

    const updated = await this.prisma.regularizationRequest.update({
      where: { id },
      data: {
        status: RegularizationStatus.REJECTED,
        rejectedBy: rejector.id,
        rejectedAt: new Date(),
        rejectionReason: rejectDto.rejectionReason,
        comments: rejectDto.comments,
        currentApproverId: null,
      },
    });

    await this.auditService.log(AuditAction.REJECT, 'RegularizationRequest', {
      tenantId,
      userId,
      employeeId: regularization.employeeId,
      entityId: id,
      newValues: updated,
    });

    return updated;
  }

  async cancel(id: string, employeeId: string, tenantId: string, userId: string) {
    const regularization = await this.findOne(id, tenantId);

    if (regularization.employeeId !== employeeId) {
      throw new ForbiddenException('You can only cancel your own regularization requests');
    }

    if (regularization.status !== RegularizationStatus.PENDING) {
      throw new BadRequestException(`Cannot cancel request with status: ${regularization.status}`);
    }

    const updated = await this.prisma.regularizationRequest.update({
      where: { id },
      data: {
        status: RegularizationStatus.CANCELLED,
        currentApproverId: null,
      },
    });

    await this.auditService.log(AuditAction.UPDATE, 'RegularizationRequest', {
      tenantId,
      userId,
      employeeId,
      entityId: id,
      newValues: updated,
    });

    return updated;
  }
}

