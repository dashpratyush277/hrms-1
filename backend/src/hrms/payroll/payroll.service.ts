import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../security/audit/audit.service';
import { AuditAction } from '@prisma/client';

/**
 * Legacy PayrollService - kept for backward compatibility
 * New payroll processing will be handled by PayrollProcessingService
 */
@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getPayslips(tenantId: string, employeeId?: string, year?: number, month?: number) {
    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (year) where.year = year;
    if (month) where.month = month;

    return this.prisma.payslip.findMany({
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
        payrollRun: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        lineItems: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }
}

