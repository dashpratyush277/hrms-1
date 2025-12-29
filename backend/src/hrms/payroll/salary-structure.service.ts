import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../security/audit/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class SalaryStructureService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Create or update salary structure for an employee
   */
  async createOrUpdate(
    employeeId: string,
    templateId: string | null,
    basicSalary: number,
    effectiveFrom: Date,
    effectiveTo: Date | null,
    tenantId: string,
    userId: string,
  ) {
    // Deactivate previous active structures
    await this.prisma.salaryStructure.updateMany({
      where: {
        employeeId,
        tenantId,
        isActive: true,
      },
      data: {
        isActive: false,
        effectiveTo: effectiveFrom,
      },
    });

    const structure = await this.prisma.salaryStructure.create({
      data: {
        employeeId,
        tenantId,
        templateId,
        basicSalary,
        effectiveFrom,
        effectiveTo,
        createdBy: userId,
      },
      include: {
        template: {
          include: {
            items: {
              include: {
                component: true,
              },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    await this.auditService.log(AuditAction.CREATE, 'SalaryStructure', {
      tenantId,
      userId,
      employeeId,
      entityId: structure.id,
      newValues: structure,
    });

    return structure;
  }

  /**
   * Get active salary structure for an employee
   */
  async getActiveStructure(employeeId: string, tenantId: string, date?: Date) {
    const effectiveDate = date || new Date();

    return this.prisma.salaryStructure.findFirst({
      where: {
        employeeId,
        tenantId,
        isActive: true,
        effectiveFrom: { lte: effectiveDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: effectiveDate } },
        ],
      },
      include: {
        template: {
          include: {
            items: {
              include: {
                component: true,
              },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Get all salary structures for an employee
   */
  async getEmployeeStructures(employeeId: string, tenantId: string) {
    return this.prisma.salaryStructure.findMany({
      where: {
        employeeId,
        tenantId,
      },
      include: {
        template: {
          include: {
            items: {
              include: {
                component: true,
              },
            },
          },
        },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}

