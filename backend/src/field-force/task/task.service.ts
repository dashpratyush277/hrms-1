import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../security/audit/audit.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createDto: CreateTaskDto, tenantId: string, assignedById?: string) {
    const task = await this.prisma.task.create({
      data: {
        ...createDto,
        tenantId,
        assignedById,
        dueDate: createDto.dueDate ? new Date(createDto.dueDate) : null,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
        doctor: true,
        campaign: true,
      },
    });

    await this.auditService.log(AuditAction.CREATE, 'Task', {
      tenantId,
      userId: assignedById,
      employeeId: createDto.employeeId,
      entityId: task.id,
      newValues: task,
    });

    return task;
  }

  async findAll(tenantId: string, employeeId?: string, status?: string) {
    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    return this.prisma.task.findMany({
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
        doctor: true,
        campaign: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const task = await this.prisma.task.findFirst({
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
        doctor: true,
        campaign: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(id: string, updateDto: UpdateTaskDto, tenantId: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const updateData: any = { ...updateDto };
    if (updateDto.dueDate) {
      updateData.dueDate = new Date(updateDto.dueDate);
    }
    if (updateDto.status === 'COMPLETED' && task.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
        doctor: true,
        campaign: true,
      },
    });

    await this.auditService.log(AuditAction.UPDATE, 'Task', {
      tenantId,
      userId,
      employeeId: task.employeeId,
      entityId: task.id,
      oldValues: task,
      newValues: updated,
    });

    return updated;
  }

  async remove(id: string, tenantId: string, userId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.task.delete({
      where: { id },
    });

    await this.auditService.log(AuditAction.DELETE, 'Task', {
      tenantId,
      userId,
      employeeId: task.employeeId,
      entityId: id,
      oldValues: task,
    });

    return { message: 'Task deleted successfully' };
  }
}

