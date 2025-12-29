import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../security/audit/audit.service';
import { CreateLeaveTypeDto } from './dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class LeaveTypeService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createDto: CreateLeaveTypeDto, tenantId: string, userId: string) {
    // Check if code already exists
    const existing = await this.prisma.leaveType.findFirst({
      where: {
        code: createDto.code,
        tenantId,
      },
    });

    if (existing) {
      throw new BadRequestException(`Leave type with code "${createDto.code}" already exists`);
    }

    const leaveType = await this.prisma.leaveType.create({
      data: {
        ...createDto,
        tenantId,
      },
    });

    await this.auditService.log(AuditAction.CREATE, 'LeaveType', {
      tenantId,
      userId,
      entityId: leaveType.id,
      newValues: leaveType,
    });

    return leaveType;
  }

  async findAll(tenantId: string) {
    return this.prisma.leaveType.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id, tenantId },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    return leaveType;
  }

  async update(id: string, updateDto: Partial<CreateLeaveTypeDto>, tenantId: string, userId: string) {
    const existing = await this.findOne(id, tenantId);

    // Check code uniqueness if updating code
    if (updateDto.code && updateDto.code !== existing.code) {
      const codeExists = await this.prisma.leaveType.findFirst({
        where: {
          code: updateDto.code,
          tenantId,
          id: { not: id },
        },
      });

      if (codeExists) {
        throw new BadRequestException(`Leave type with code "${updateDto.code}" already exists`);
      }
    }

    const updated = await this.prisma.leaveType.update({
      where: { id },
      data: updateDto,
    });

    await this.auditService.log(AuditAction.UPDATE, 'LeaveType', {
      tenantId,
      userId,
      entityId: id,
      oldValues: existing,
      newValues: updated,
    });

    return updated;
  }

  async delete(id: string, tenantId: string, userId: string) {
    const leaveType = await this.findOne(id, tenantId);

    // Check if there are any applications using this leave type
    const applications = await this.prisma.leaveApplication.findFirst({
      where: { leaveTypeId: id, tenantId },
    });

    if (applications) {
      throw new BadRequestException('Cannot delete leave type with existing applications');
    }

    await this.prisma.leaveType.delete({
      where: { id },
    });

    await this.auditService.log(AuditAction.DELETE, 'LeaveType', {
      tenantId,
      userId,
      entityId: id,
      oldValues: leaveType,
    });

    return { message: 'Leave type deleted successfully' };
  }
}

