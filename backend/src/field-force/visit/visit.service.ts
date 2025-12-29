import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../security/audit/audit.service';
import { CreateVisitDto, EndVisitDto } from './dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class VisitService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async start(createDto: CreateVisitDto, employeeId: string, tenantId: string, userId: string) {
    // GPS validation - mandatory for field visits
    if (!createDto.startLat || !createDto.startLng) {
      throw new BadRequestException('GPS coordinates are mandatory to start a visit');
    }

    // Validate GPS coordinates are reasonable (not 0,0 or invalid)
    if (createDto.startLat === 0 && createDto.startLng === 0) {
      throw new BadRequestException('Invalid GPS coordinates');
    }

    // Check if doctor exists and is approved
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: createDto.doctorId, tenantId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (doctor.status !== 'APPROVED') {
      throw new BadRequestException('Cannot visit a doctor that is not approved');
    }

    // Check if there's already an active visit for this employee
    const activeVisit = await this.prisma.visit.findFirst({
      where: {
        employeeId,
        tenantId,
        status: 'IN_PROGRESS',
      },
    });

    if (activeVisit) {
      throw new BadRequestException('You have an active visit. Please end it before starting a new one.');
    }

    const visitDate = new Date(createDto.visitDate);
    visitDate.setHours(0, 0, 0, 0);

    const visit = await this.prisma.visit.create({
      data: {
        employeeId,
        tenantId,
        doctorId: createDto.doctorId,
        visitDate,
        startTime: new Date(),
        startLat: createDto.startLat,
        startLng: createDto.startLng,
        startAddress: createDto.startAddress,
        notes: createDto.notes,
        attachments: createDto.attachments || [],
        status: 'IN_PROGRESS',
      },
      include: {
        doctor: true,
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

    await this.auditService.log(AuditAction.CREATE, 'Visit', {
      tenantId,
      userId,
      employeeId,
      entityId: visit.id,
      newValues: { action: 'VISIT_STARTED', doctorId: createDto.doctorId },
    });

    return visit;
  }

  async end(id: string, endDto: EndVisitDto, employeeId: string, tenantId: string, userId: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id, employeeId, tenantId },
    });

    if (!visit) {
      throw new NotFoundException('Visit not found');
    }

    if (visit.status === 'COMPLETED') {
      throw new BadRequestException('Visit already completed');
    }

    if (visit.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Visit is not in progress');
    }

    // GPS validation for end visit
    if (!endDto.endLat || !endDto.endLng) {
      throw new BadRequestException('GPS coordinates are mandatory to end a visit');
    }

    // Validate GPS coordinates
    if (endDto.endLat === 0 && endDto.endLng === 0) {
      throw new BadRequestException('Invalid GPS coordinates');
    }

    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - visit.startTime.getTime()) / (1000 * 60));

    // Update route item status if visit is linked to a route
    if (visit.doctorId) {
      const routePlan = await this.prisma.routePlan.findFirst({
        where: {
          employeeId,
          tenantId,
          date: visit.visitDate,
        },
        include: {
          routeItems: {
            where: { doctorId: visit.doctorId },
          },
        },
      });

      if (routePlan && routePlan.routeItems.length > 0) {
        await this.prisma.routeItem.update({
          where: { id: routePlan.routeItems[0].id },
          data: {
            status: 'VISITED',
            actualTime: endTime,
          },
        });

        // Update route plan completed visits count
        await this.prisma.routePlan.update({
          where: { id: routePlan.id },
          data: {
            completedVisits: { increment: 1 },
          },
        });
      }
    }

    const updated = await this.prisma.visit.update({
      where: { id },
      data: {
        endTime,
        endLat: endDto.endLat,
        endLng: endDto.endLng,
        endAddress: endDto.endAddress,
        duration,
        notes: endDto.notes || visit.notes,
        attachments: endDto.attachments ? [...(visit.attachments || []), ...endDto.attachments] : visit.attachments,
        status: 'COMPLETED',
      },
      include: {
        doctor: true,
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

    await this.auditService.log(AuditAction.UPDATE, 'Visit', {
      tenantId,
      userId,
      employeeId,
      entityId: visit.id,
      newValues: { action: 'VISIT_ENDED', duration },
    });

    return updated;
  }

  async findAll(tenantId: string, employeeId?: string, doctorId?: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (doctorId) where.doctorId = doctorId;
    if (startDate || endDate) {
      where.visitDate = {};
      if (startDate) where.visitDate.gte = startDate;
      if (endDate) where.visitDate.lte = endDate;
    }

    return this.prisma.visit.findMany({
      where,
      include: {
        doctor: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
      orderBy: { visitDate: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id, tenantId },
      include: {
        doctor: true,
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

    if (!visit) {
      throw new NotFoundException('Visit not found');
    }

    return visit;
  }
}

