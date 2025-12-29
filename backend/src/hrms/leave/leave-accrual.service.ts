import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccrualType } from '@prisma/client';

@Injectable()
export class LeaveAccrualService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate accrual for an employee based on policy
   */
  async calculateAccrual(
    employeeId: string,
    leaveTypeId: string,
    tenantId: string,
    year: number,
  ): Promise<number> {
    // Get active policy for this leave type
    const policy = await this.prisma.leavePolicy.findFirst({
      where: {
        leaveTypeId,
        tenantId,
        isDefault: true,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!policy) {
      return 0;
    }

    // Check if employee is eligible based on filters
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: { designation: true },
    });

    if (!employee) {
      return 0;
    }

    // Check location filter
    if (policy.locationFilter.length > 0 && employee.location) {
      if (!policy.locationFilter.includes(employee.location)) {
        return 0;
      }
    }

    // Check grade filter
    if (policy.gradeFilter.length > 0 && employee.designationId) {
      if (!policy.gradeFilter.includes(employee.designationId)) {
        return 0;
      }
    }

    // Calculate accrual based on type
    let accrualDays = 0;

    switch (policy.accrualType) {
      case AccrualType.ANNUAL:
        accrualDays = policy.accrualDays;
        break;

      case AccrualType.MONTHLY:
        accrualDays = (policy.accrualDays / policy.accrualPeriod) * 12;
        break;

      case AccrualType.PRORATED:
        // Prorate based on joining date
        if (policy.proratedForJoiners && employee.dateOfJoining) {
          const joiningDate = new Date(employee.dateOfJoining);
          const yearStart = new Date(year, 0, 1);
          const yearEnd = new Date(year, 11, 31);
          
          let startDate = joiningDate > yearStart ? joiningDate : yearStart;
          let endDate = yearEnd;
          
          const daysInYear = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          const totalDaysInYear = 365;
          
          accrualDays = (policy.accrualDays * daysInYear) / totalDaysInYear;
        } else {
          accrualDays = policy.accrualDays;
        }
        break;

      case AccrualType.NONE:
        accrualDays = 0;
        break;
    }

    return Math.round(accrualDays * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Record accrual in ledger
   */
  async recordAccrual(
    employeeId: string,
    leaveTypeId: string,
    tenantId: string,
    year: number,
    days: number,
    policyId: string,
    description?: string,
  ) {
    // Get current balance
    const balance = await this.getCurrentBalance(employeeId, leaveTypeId, tenantId, year);
    
    const ledgerEntry = await this.prisma.leaveAccrualLedger.create({
      data: {
        employeeId,
        tenantId,
        leaveTypeId,
        leavePolicyId: policyId,
        transactionType: 'ACCRUAL',
        days,
        balanceBefore: balance,
        balanceAfter: balance + days,
        year,
        effectiveDate: new Date(),
        description: description || `Accrual for ${year}`,
        createdBy: 'SYSTEM',
      },
    });

    // Update balance
    await this.updateBalance(employeeId, leaveTypeId, tenantId, year, days, 0, 0);

    return ledgerEntry;
  }

  /**
   * Get current balance from ledger
   */
  async getCurrentBalance(
    employeeId: string,
    leaveTypeId: string,
    tenantId: string,
    year: number,
  ): Promise<number> {
    const lastEntry = await this.prisma.leaveAccrualLedger.findFirst({
      where: {
        employeeId,
        leaveTypeId,
        tenantId,
        year,
      },
      orderBy: { createdAt: 'desc' },
    });

    return lastEntry?.balanceAfter || 0;
  }

  /**
   * Update leave balance (also updates ledger)
   */
  async updateBalance(
    employeeId: string,
    leaveTypeId: string,
    tenantId: string,
    year: number,
    addTotal: number,
    addUsed: number,
    addPending: number,
  ) {
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year_tenantId: {
          employeeId,
          leaveTypeId,
          year,
          tenantId,
        },
      },
    });

    if (balance) {
      await this.prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          totalDays: balance.totalDays + addTotal,
          usedDays: balance.usedDays + addUsed,
          pendingDays: balance.pendingDays + addPending,
        },
      });
    } else {
      await this.prisma.leaveBalance.create({
        data: {
          employeeId,
          tenantId,
          leaveTypeId,
          year,
          totalDays: addTotal,
          usedDays: addUsed,
          pendingDays: addPending,
        },
      });
    }
  }

  /**
   * Process annual accruals for all employees
   */
  async processAnnualAccruals(tenantId: string, year: number) {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
    });

    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { tenantId, isActive: true },
    });

    for (const leaveType of leaveTypes) {
      const policy = await this.prisma.leavePolicy.findFirst({
        where: {
          leaveTypeId: leaveType.id,
          tenantId,
          isDefault: true,
          accrualType: AccrualType.ANNUAL,
        },
      });

      if (policy) {
        for (const employee of employees) {
          const accrualDays = await this.calculateAccrual(
            employee.id,
            leaveType.id,
            tenantId,
            year,
          );

          if (accrualDays > 0) {
            await this.recordAccrual(
              employee.id,
              leaveType.id,
              tenantId,
              year,
              accrualDays,
              policy.id,
              `Annual accrual for ${year}`,
            );
          }
        }
      }
    }
  }
}

