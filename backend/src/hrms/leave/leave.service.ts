import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../security/audit/audit.service';
import { LeaveBalanceService } from './leave-balance.service';
import { LeaveAccrualService } from './leave-accrual.service';
import { CreateLeaveApplicationDto, UpdateLeaveApplicationDto, ApproveLeaveDto } from './dto';
import { LeaveStatus, AuditAction, Role } from '@prisma/client';

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private balanceService: LeaveBalanceService,
    private accrualService: LeaveAccrualService,
  ) {}

  async apply(createDto: CreateLeaveApplicationDto, employeeId: string, tenantId: string, userId: string) {
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Calculate days (handle half-day)
    let days = 0;
    if (createDto.isHalfDay) {
      days = 0.5;
    } else {
      days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    // Validate leave type
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: createDto.leaveTypeId, tenantId, isActive: true },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    // Validate half-day
    if (createDto.isHalfDay && !leaveType.halfDayAllowed) {
      throw new BadRequestException('Half-day leave is not allowed for this leave type');
    }

    // Validate max days per request
    if (leaveType.maxDaysPerRequest && days > leaveType.maxDaysPerRequest) {
      throw new BadRequestException(`Maximum ${leaveType.maxDaysPerRequest} days allowed per request`);
    }

    // Validate attachment requirement
    if (leaveType.attachmentRequired && (!createDto.attachments || createDto.attachments.length === 0)) {
      throw new BadRequestException('Attachment is required for this leave type');
    }

    // Check leave balance
    const year = new Date().getFullYear();
    const balance = await this.balanceService.getBalance(employeeId, createDto.leaveTypeId, tenantId, year);

    if (balance.availableDays < days) {
      throw new BadRequestException(`Insufficient leave balance. Available: ${balance.availableDays}, Requested: ${days}`);
    }

    // Get employee and determine approver
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: { reportingManager: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Determine current approver (reporting manager or HR)
    let currentApproverId = null;
    if (leaveType.requiresApproval) {
      if (employee.reportingManagerId) {
        currentApproverId = employee.reportingManagerId;
      } else {
        // If no manager, assign to HR admin
        const hrAdmin = await this.prisma.user.findFirst({
          where: {
            tenantId,
            role: Role.HR_ADMIN,
            isActive: true,
          },
          include: { employee: true },
        });
        if (hrAdmin?.employee) {
          currentApproverId = hrAdmin.employee.id;
        }
      }
    }

    // Create application
    const application = await this.prisma.leaveApplication.create({
      data: {
        employeeId,
        tenantId,
        leaveTypeId: createDto.leaveTypeId,
        startDate,
        endDate,
        days,
        isHalfDay: createDto.isHalfDay || false,
        halfDayType: createDto.halfDayType,
        reason: createDto.reason,
        attachments: createDto.attachments || [],
        status: leaveType.requiresApproval ? LeaveStatus.PENDING : LeaveStatus.APPROVED,
        currentApproverId,
      },
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
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

    // Record in ledger
    const balanceBefore = balance.availableDays;
    await this.prisma.leaveAccrualLedger.create({
      data: {
        employeeId,
        tenantId,
        leaveTypeId: createDto.leaveTypeId,
        leaveApplicationId: application.id,
        transactionType: 'APPLICATION',
        days,
        balanceBefore,
        balanceAfter: balanceBefore - days,
        year,
        effectiveDate: startDate,
        description: `Leave application: ${leaveType.name}`,
        createdBy: userId,
      },
    });

    // Update pending days
    await this.accrualService.updateBalance(employeeId, createDto.leaveTypeId, tenantId, year, 0, 0, days);

    // If auto-approved, process immediately
    if (!leaveType.requiresApproval) {
      await this.approve(application.id, { status: LeaveStatus.APPROVED, comments: 'Auto-approved' }, tenantId, 'SYSTEM');
    }

    await this.auditService.log(AuditAction.CREATE, 'LeaveApplication', {
      tenantId,
      userId,
      employeeId,
      entityId: application.id,
      newValues: application,
    });

    return application;
  }

  async update(id: string, updateDto: UpdateLeaveApplicationDto, employeeId: string, tenantId: string, userId: string) {
    const application = await this.prisma.leaveApplication.findFirst({
      where: { id, tenantId, employeeId },
    });

    if (!application) {
      throw new NotFoundException('Leave application not found');
    }

    if (application.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending applications can be modified');
    }

    const startDate = updateDto.startDate ? new Date(updateDto.startDate) : application.startDate;
    const endDate = updateDto.endDate ? new Date(updateDto.endDate) : application.endDate;

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    let days = 0;
    if (updateDto.isHalfDay || application.isHalfDay) {
      days = 0.5;
    } else {
      days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    const daysDiff = days - application.days;

    // Check balance if increasing days
    if (daysDiff > 0) {
      const year = new Date(application.startDate).getFullYear();
      const balance = await this.balanceService.getBalance(employeeId, application.leaveTypeId, tenantId, year);

      if (balance.availableDays < daysDiff) {
        throw new BadRequestException(`Insufficient leave balance for additional ${daysDiff} days`);
      }
    }

    const updated = await this.prisma.leaveApplication.update({
      where: { id },
      data: {
        startDate: updateDto.startDate ? new Date(updateDto.startDate) : undefined,
        endDate: updateDto.endDate ? new Date(updateDto.endDate) : undefined,
        days,
        isHalfDay: updateDto.isHalfDay !== undefined ? updateDto.isHalfDay : undefined,
        reason: updateDto.reason,
        attachments: updateDto.attachments,
      },
      include: {
        leaveType: true,
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

    // Update ledger if days changed
    if (daysDiff !== 0) {
      const year = new Date(application.startDate).getFullYear();
      const balance = await this.balanceService.getBalance(employeeId, application.leaveTypeId, tenantId, year);
      
      await this.prisma.leaveAccrualLedger.create({
        data: {
          employeeId,
          tenantId,
          leaveTypeId: application.leaveTypeId,
          leaveApplicationId: application.id,
          transactionType: 'APPLICATION',
          days: daysDiff,
          balanceBefore: balance.availableDays,
          balanceAfter: balance.availableDays - daysDiff,
          year,
          effectiveDate: startDate,
          description: `Leave application updated`,
          createdBy: userId,
        },
      });

      await this.accrualService.updateBalance(employeeId, application.leaveTypeId, tenantId, year, 0, 0, daysDiff);
    }

    await this.auditService.log(AuditAction.UPDATE, 'LeaveApplication', {
      tenantId,
      userId,
      employeeId,
      entityId: id,
      newValues: updated,
    });

    return updated;
  }

  async cancel(id: string, reason: string, employeeId: string, tenantId: string, userId: string) {
    const application = await this.prisma.leaveApplication.findFirst({
      where: { id, tenantId, employeeId },
    });

    if (!application) {
      throw new NotFoundException('Leave application not found');
    }

    if (application.status === LeaveStatus.CANCELLED) {
      throw new BadRequestException('Application already cancelled');
    }

    if (application.status === LeaveStatus.APPROVED) {
      throw new BadRequestException('Approved applications cannot be cancelled. Please contact HR.');
    }

    const year = new Date(application.startDate).getFullYear();
    const balance = await this.balanceService.getBalance(employeeId, application.leaveTypeId, tenantId, year);

    // Record cancellation in ledger
    await this.prisma.leaveAccrualLedger.create({
      data: {
        employeeId,
        tenantId,
        leaveTypeId: application.leaveTypeId,
        leaveApplicationId: application.id,
        transactionType: 'CANCELLATION',
        days: -application.days,
        balanceBefore: balance.availableDays,
        balanceAfter: balance.availableDays + application.days,
        year,
        effectiveDate: new Date(),
        description: `Leave application cancelled: ${reason}`,
        createdBy: userId,
      },
    });

    // Remove pending days
    await this.accrualService.updateBalance(employeeId, application.leaveTypeId, tenantId, year, 0, 0, -application.days);

    const updated = await this.prisma.leaveApplication.update({
      where: { id },
      data: {
        status: LeaveStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: reason,
        currentApproverId: null,
      },
      include: {
        leaveType: true,
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

    // Record approval history
    await this.prisma.leaveApprovalHistory.create({
      data: {
        leaveApplicationId: id,
        approverId: employeeId,
        action: 'CANCEL',
        status: LeaveStatus.CANCELLED,
        comments: reason,
      },
    });

    await this.auditService.log(AuditAction.DELETE, 'LeaveApplication', {
      tenantId,
      userId,
      employeeId,
      entityId: id,
      oldValues: application,
    });

    return updated;
  }

  async approve(id: string, approveDto: ApproveLeaveDto, tenantId: string, approverId: string) {
    const application = await this.prisma.leaveApplication.findFirst({
      where: { id, tenantId },
      include: { employee: true, leaveType: true },
    });

    if (!application) {
      throw new NotFoundException('Leave application not found');
    }

    // Check if approver is authorized
    const approver = await this.prisma.employee.findFirst({
      where: { id: approverId, tenantId },
      include: { user: true },
    });

    if (!approver) {
      throw new NotFoundException('Approver not found');
    }

    // Verify approver is the current approver or has HR/Admin role
    const isAuthorized = 
      application.currentApproverId === approverId ||
      approver.user?.role === Role.HR_ADMIN ||
      approver.user?.role === Role.TENANT_ADMIN;

    if (!isAuthorized && application.status === LeaveStatus.PENDING) {
      throw new ForbiddenException('You are not authorized to approve this leave application');
    }

    if (application.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Application already processed');
    }

    const year = new Date(application.startDate).getFullYear();
    const balance = await this.balanceService.getBalance(
      application.employeeId,
      application.leaveTypeId,
      tenantId,
      year,
    );

    const updateData: any = {
      status: approveDto.status,
      comments: approveDto.comments,
      currentApproverId: null,
    };

    if (approveDto.status === LeaveStatus.APPROVED) {
      updateData.approvedBy = approverId;
      updateData.approvedAt = new Date();

      // Record approval in ledger
      await this.prisma.leaveAccrualLedger.create({
        data: {
          employeeId: application.employeeId,
          tenantId,
          leaveTypeId: application.leaveTypeId,
          leaveApplicationId: application.id,
          transactionType: 'APPROVAL',
          days: application.days,
          balanceBefore: balance.availableDays,
          balanceAfter: balance.availableDays - application.days,
          year,
          effectiveDate: application.startDate,
          description: `Leave approved: ${application.leaveType.name}`,
          createdBy: approverId,
        },
      });

      // Move from pending to used
      await this.accrualService.updateBalance(
        application.employeeId,
        application.leaveTypeId,
        tenantId,
        year,
        0,
        application.days,
        -application.days,
      );
    } else if (approveDto.status === LeaveStatus.REJECTED) {
      updateData.rejectedBy = approverId;
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = approveDto.rejectionReason;

      // Record rejection in ledger
      await this.prisma.leaveAccrualLedger.create({
        data: {
          employeeId: application.employeeId,
          tenantId,
          leaveTypeId: application.leaveTypeId,
          leaveApplicationId: application.id,
          transactionType: 'REJECTION',
          days: -application.days,
          balanceBefore: balance.availableDays,
          balanceAfter: balance.availableDays + application.days,
          year,
          effectiveDate: new Date(),
          description: `Leave rejected: ${approveDto.rejectionReason || 'No reason provided'}`,
          createdBy: approverId,
        },
      });

      // Remove pending days
      await this.accrualService.updateBalance(
        application.employeeId,
        application.leaveTypeId,
        tenantId,
        year,
        0,
        0,
        -application.days,
      );
    }

    const updated = await this.prisma.leaveApplication.update({
      where: { id },
      data: updateData,
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
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
        approvalHistory: {
          include: {
            approver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Record approval history
    await this.prisma.leaveApprovalHistory.create({
      data: {
        leaveApplicationId: id,
        approverId,
        action: approveDto.status === LeaveStatus.APPROVED ? 'APPROVE' : 'REJECT',
        status: approveDto.status,
        comments: approveDto.comments || approveDto.rejectionReason,
      },
    });

    await this.auditService.log(AuditAction.APPROVE, 'LeaveApplication', {
      tenantId,
      userId: approverId,
      employeeId: application.employeeId,
      entityId: application.id,
      newValues: { status: approveDto.status },
    });

    return updated;
  }

  async findAll(tenantId: string, employeeId?: string, status?: LeaveStatus, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.OR = [];
      if (startDate) {
        where.OR.push({ startDate: { gte: startDate } });
      }
      if (endDate) {
        where.OR.push({ endDate: { lte: endDate } });
      }
    }

    return this.prisma.leaveApplication.findMany({
      where,
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
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
        approvalHistory: {
          include: {
            approver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const application = await this.prisma.leaveApplication.findFirst({
      where: { id, tenantId },
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
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
        approvalHistory: {
          include: {
            approver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Leave application not found');
    }

    return application;
  }

  async getBalances(employeeId: string, tenantId: string, year?: number) {
    const y = year || new Date().getFullYear();
    return this.balanceService.getAllBalances(employeeId, tenantId, y);
  }

  async getTeamLeaves(managerId: string, tenantId: string, status?: LeaveStatus, startDate?: Date, endDate?: Date) {
    // Get all employees reporting to this manager
    const teamMembers = await this.prisma.employee.findMany({
      where: {
        tenantId,
        reportingManagerId: managerId,
        isActive: true,
      },
      select: { id: true },
    });

    const employeeIds = teamMembers.map(emp => emp.id);

    const where: any = {
      tenantId,
      employeeId: { in: employeeIds },
    };

    if (status) where.status = status;
    if (startDate || endDate) {
      where.OR = [];
      if (startDate) {
        where.OR.push({ startDate: { gte: startDate } });
      }
      if (endDate) {
        where.OR.push({ endDate: { lte: endDate } });
      }
    }

    return this.prisma.leaveApplication.findMany({
      where,
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }
}
