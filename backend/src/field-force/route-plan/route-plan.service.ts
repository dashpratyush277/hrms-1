import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoutePlanDto, UpdateRouteItemDto } from './dto';

@Injectable()
export class RoutePlanService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateRoutePlanDto, employeeId: string, tenantId: string) {
    const date = new Date(createDto.date);
    date.setHours(0, 0, 0, 0);

    const routePlan = await this.prisma.routePlan.create({
      data: {
        employeeId,
        tenantId,
        date,
        plannedVisits: createDto.items?.length || 0,
        notes: createDto.notes,
        routeItems: {
          create: createDto.items?.map((item, index) => ({
            doctorId: item.doctorId,
            sequence: index + 1,
            plannedTime: item.plannedTime ? new Date(item.plannedTime) : null,
          })) || [],
        },
      },
      include: {
        routeItems: {
          include: {
            doctor: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    return routePlan;
  }

  async findAll(tenantId: string, employeeId?: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return this.prisma.routePlan.findMany({
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
        routeItems: {
          include: {
            doctor: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const routePlan = await this.prisma.routePlan.findFirst({
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
        routeItems: {
          include: {
            doctor: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!routePlan) {
      throw new NotFoundException('Route plan not found');
    }

    return routePlan;
  }

  async updateRouteItem(routePlanId: string, itemId: string, updateDto: UpdateRouteItemDto, tenantId: string) {
    const routePlan = await this.prisma.routePlan.findFirst({
      where: { id: routePlanId, tenantId },
    });

    if (!routePlan) {
      throw new NotFoundException('Route plan not found');
    }

    const item = await this.prisma.routeItem.update({
      where: { id: itemId },
      data: {
        actualTime: updateDto.actualTime ? new Date(updateDto.actualTime) : null,
        status: updateDto.status,
        notes: updateDto.notes,
      },
    });

    // Update completed visits count
    const completedCount = await this.prisma.routeItem.count({
      where: {
        routePlanId,
        status: 'VISITED',
      },
    });

    await this.prisma.routePlan.update({
      where: { id: routePlanId },
      data: { completedVisits: completedCount },
    });

    return item;
  }
}

