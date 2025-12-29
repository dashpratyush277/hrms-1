import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../security/audit/audit.service';
import { CreateAttendancePolicyDto } from './dto/create-policy.dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AttendancePolicyService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createDto: CreateAttendancePolicyDto, tenantId: string, userId: string) {
    // If this is set as default, unset other defaults
    if (createDto.isDefault) {
      await this.prisma.attendancePolicy.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const policy = await this.prisma.attendancePolicy.create({
      data: {
        ...createDto,
        tenantId,
      },
    });

    await this.auditService.log(AuditAction.CREATE, 'AttendancePolicy', {
      tenantId,
      userId,
      entityId: policy.id,
      newValues: policy,
    });

    return policy;
  }

  async findAll(tenantId: string) {
    return this.prisma.attendancePolicy.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, tenantId: string) {
    const policy = await this.prisma.attendancePolicy.findFirst({
      where: { id, tenantId },
    });

    if (!policy) {
      throw new NotFoundException('Attendance policy not found');
    }

    return policy;
  }

  async update(id: string, updateDto: Partial<CreateAttendancePolicyDto>, tenantId: string, userId: string) {
    const existing = await this.findOne(id, tenantId);

    // If setting as default, unset other defaults
    if (updateDto.isDefault === true) {
      await this.prisma.attendancePolicy.updateMany({
        where: { tenantId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const policy = await this.prisma.attendancePolicy.update({
      where: { id },
      data: updateDto,
    });

    await this.auditService.log(AuditAction.UPDATE, 'AttendancePolicy', {
      tenantId,
      userId,
      entityId: id,
      oldValues: existing,
      newValues: policy,
    });

    return policy;
  }

  async delete(id: string, tenantId: string, userId: string) {
    const policy = await this.findOne(id, tenantId);

    // Check if policy is assigned to any employees
    const employeeCount = await this.prisma.employee.count({
      where: { attendancePolicyId: id, tenantId },
    });

    if (employeeCount > 0) {
      throw new BadRequestException(
        `Cannot delete policy. It is assigned to ${employeeCount} employee(s). Please reassign them first.`,
      );
    }

    await this.prisma.attendancePolicy.delete({
      where: { id },
    });

    await this.auditService.log(AuditAction.DELETE, 'AttendancePolicy', {
      tenantId,
      userId,
      entityId: id,
      oldValues: policy,
    });

    return { message: 'Policy deleted successfully' };
  }

  async assignToEmployee(employeeId: string, policyId: string, tenantId: string, userId: string) {
    // Verify employee and policy belong to tenant
    const [employee, policy] = await Promise.all([
      this.prisma.employee.findFirst({ where: { id: employeeId, tenantId } }),
      this.findOne(policyId, tenantId),
    ]);

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: { attendancePolicyId: policyId },
    });

    await this.auditService.log(AuditAction.UPDATE, 'Employee', {
      tenantId,
      userId,
      employeeId,
      entityId: employeeId,
      newValues: { attendancePolicyId: policyId },
    });

    return updated;
  }
}

