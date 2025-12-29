import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LeaveBalanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get real-time balance calculated from ledger
   */
  async getBalance(
    employeeId: string,
    leaveTypeId: string,
    tenantId: string,
    year: number,
  ) {
    // Get balance record
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year_tenantId: {
          employeeId,
          leaveTypeId,
          year,
          tenantId,
        },
      },
      include: {
        leaveType: true,
      },
    });

    if (!balance) {
      return {
        totalDays: 0,
        usedDays: 0,
        pendingDays: 0,
        carryForward: 0,
        availableDays: 0,
        leaveType: null,
      };
    }

    // Calculate available days
    const availableDays = balance.totalDays + balance.carryForward - balance.usedDays - balance.pendingDays;

    return {
      ...balance,
      availableDays: Math.max(0, availableDays),
    };
  }

  /**
   * Get all balances for an employee
   */
  async getAllBalances(employeeId: string, tenantId: string, year: number) {
    const balances = await this.prisma.leaveBalance.findMany({
      where: {
        employeeId,
        tenantId,
        year,
      },
      include: {
        leaveType: true,
      },
    });

    return balances.map(balance => ({
      ...balance,
      availableDays: Math.max(0, balance.totalDays + balance.carryForward - balance.usedDays - balance.pendingDays),
    }));
  }

  /**
   * Get balance summary with ledger verification
   */
  async getBalanceSummary(employeeId: string, tenantId: string, year: number) {
    const balances = await this.getAllBalances(employeeId, tenantId, year);

    // Verify balances against ledger
    const verifiedBalances = await Promise.all(
      balances.map(async (balance) => {
        const ledgerTotal = await this.calculateFromLedger(
          employeeId,
          balance.leaveTypeId,
          tenantId,
          year,
        );

        return {
          ...balance,
          ledgerVerified: Math.abs(balance.totalDays - ledgerTotal.total) < 0.01,
          ledgerTotal: ledgerTotal.total,
        };
      }),
    );

    return verifiedBalances;
  }

  /**
   * Calculate balance from ledger (source of truth)
   */
  private async calculateFromLedger(
    employeeId: string,
    leaveTypeId: string,
    tenantId: string,
    year: number,
  ) {
    const entries = await this.prisma.leaveAccrualLedger.findMany({
      where: {
        employeeId,
        leaveTypeId,
        tenantId,
        year,
      },
      orderBy: { createdAt: 'asc' },
    });

    let total = 0;
    let used = 0;
    let pending = 0;

    for (const entry of entries) {
      switch (entry.transactionType) {
        case 'ACCRUAL':
        case 'CARRY_FORWARD':
          total += entry.days;
          break;
        case 'APPROVAL':
          used += entry.days;
          pending -= entry.days;
          break;
        case 'APPLICATION':
          pending += entry.days;
          break;
        case 'REJECTION':
        case 'CANCELLATION':
          pending -= entry.days;
          break;
        case 'ENCASHMENT':
        case 'LAPSE':
          total -= entry.days;
          break;
      }
    }

    return { total, used, pending };
  }
}

