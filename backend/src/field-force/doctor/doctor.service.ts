import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../security/audit/audit.service';
import { CreateDoctorDto, UpdateDoctorDto, ApproveDoctorDto } from './dto';
import { DoctorStatus, AuditAction } from '@prisma/client';

@Injectable()
export class DoctorService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(createDto: CreateDoctorDto, tenantId: string, proposedBy?: string, userId?: string) {
    // Check for duplicate (same name + location within 100m)
    if (createDto.latitude && createDto.longitude) {
      const nearbyDoctors = await this.prisma.doctor.findMany({
        where: {
          tenantId,
          name: { equals: createDto.name, mode: 'insensitive' },
          latitude: { not: null },
          longitude: { not: null },
        },
      });

      // Check if any doctor is within 100 meters (approximately 0.001 degrees)
      for (const existing of nearbyDoctors) {
        if (existing.latitude && existing.longitude) {
          const latDiff = Math.abs(existing.latitude - createDto.latitude);
          const lngDiff = Math.abs(existing.longitude - createDto.longitude);
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
          
          if (distance < 0.001) {
            throw new BadRequestException(
              `Doctor with name "${createDto.name}" already exists at this location`
            );
          }
        }
      }
    }

    const doctor = await this.prisma.doctor.create({
      data: {
        ...createDto,
        tenantId,
        proposedBy,
        status: proposedBy ? DoctorStatus.PENDING : DoctorStatus.APPROVED,
      },
    });

    await this.auditService.log(AuditAction.CREATE, 'Doctor', {
      tenantId,
      userId: userId || proposedBy,
      entityId: doctor.id,
      newValues: doctor,
    });

    return doctor;
  }

  async findAll(tenantId: string, status?: DoctorStatus, search?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { specialization: { contains: search, mode: 'insensitive' } },
        { clinicName: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.doctor.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id, tenantId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return doctor;
  }

  async update(id: string, updateDto: UpdateDoctorDto, tenantId: string) {
    const doctor = await this.prisma.doctor.update({
      where: { id },
      data: updateDto,
    });

    await this.auditService.log(AuditAction.UPDATE, 'Doctor', {
      tenantId,
      entityId: doctor.id,
      newValues: updateDto,
    });

    return doctor;
  }

  async approve(id: string, approveDto: ApproveDoctorDto, tenantId: string, approvedBy: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id, tenantId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const updated = await this.prisma.doctor.update({
      where: { id },
      data: {
        status: approveDto.status,
        approvedBy,
        approvedAt: approveDto.status === DoctorStatus.APPROVED ? new Date() : null,
      },
    });

    await this.auditService.log(AuditAction.APPROVE, 'Doctor', {
      tenantId,
      userId: approvedBy,
      entityId: doctor.id,
      newValues: { status: approveDto.status },
    });

    return updated;
  }

  async remove(id: string, tenantId: string) {
    await this.prisma.doctor.delete({
      where: { id },
    });

    await this.auditService.log(AuditAction.DELETE, 'Doctor', {
      tenantId,
      entityId: id,
    });

    return { message: 'Doctor deleted successfully' };
  }
}

