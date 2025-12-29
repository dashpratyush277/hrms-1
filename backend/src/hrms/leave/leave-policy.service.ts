import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../security/audit/audit.service';
import { CreateLeavePolicyDto } from './dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class LeavePolicyService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createDto: CreateLeavePolicyDto, tenantId: string, userId: string) {
    // Verify leave type exists
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: createDto.leaveTypeId, tenantId },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    // If this is set as default, unset other defaults for this leave type
    if (createDto.isDefault) {
      await this.prisma.leavePolicy.updateMany({
        where: {
          leaveTypeId: createDto.leaveTypeId,
          tenantId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const policy = await this.prisma.leavePolicy.create({
      data: {
        ...createDto,
        tenantId,
        effectiveFrom: new Date(createDto.effectiveFrom),
        effectiveTo: createDto.effectiveTo ? new Date(createDto.effectiveTo) : null,
        lapsingDate: createDto.lapsingDate ? new Date(createDto.lapsingDate) : null,
      },
      include: {
        leaveType: true,
      },
    });

    await this.auditService.log(AuditAction.CREATE, 'LeavePolicy', {
      tenantId,
      userId,
      entityId: policy.id,
      newValues: policy,
    });

    return policy;
  }

  async findAll(tenantId: string, leaveTypeId?: string) {
    const where: any = { tenantId };
    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }

    return this.prisma.leavePolicy.findMany({
      where,
      include: {
        leaveType: true,
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const policy = await this.prisma.leavePolicy.findFirst({
      where: { id, tenantId },
      include: {
        leaveType: true,
      },
    });

    if (!policy) {
      throw new NotFoundException('Leave policy not found');
    }

    return policy;
  }

  async update(id: string, updateDto: Partial<CreateLeavePolicyDto>, tenantId: string, userId: string) {
    const existing = await this.findOne(id, tenantId);

    // If setting as default, unset other defaults
    if (updateDto.isDefault && !existing.isDefault) {
      await this.prisma.leavePolicy.updateMany({
        where: {
          leaveTypeId: existing.leaveTypeId,
          tenantId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.leavePolicy.update({
      where: { id },
      data: {
        ...updateDto,
        effectiveFrom: updateDto.effectiveFrom ? new Date(updateDto.effectiveFrom) : undefined,
        effectiveTo: updateDto.effectiveTo ? new Date(updateDto.effectiveTo) : undefined,
        lapsingDate: updateDto.lapsingDate ? new Date(updateDto.lapsingDate) : undefined,
      },
      include: {
        leaveType: true,
      },
    });

    await this.auditService.log(AuditAction.UPDATE, 'LeavePolicy', {
      tenantId,
      userId,
      entityId: id,
      oldValues: existing,
      newValues: updated,
    });

    return updated;
  }

  async delete(id: string, tenantId: string, userId: string) {
    const policy = await this.findOne(id, tenantId);

    await this.prisma.leavePolicy.delete({
      where: { id },
    });

    await this.auditService.log(AuditAction.DELETE, 'LeavePolicy', {
      tenantId,
      userId,
      entityId: id,
      oldValues: policy,
    });

    return { message: 'Leave policy deleted successfully' };
  }

  /**
   * Get active policy for a leave type
   */
  async getActivePolicy(leaveTypeId: string, tenantId: string, date?: Date) {
    const effectiveDate = date || new Date();

    return this.prisma.leavePolicy.findFirst({
      where: {
        leaveTypeId,
        tenantId,
        effectiveFrom: { lte: effectiveDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: effectiveDate } },
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { effectiveFrom: 'desc' },
      ],
      include: {
        leaveType: true,
      },
    });
  }
}

