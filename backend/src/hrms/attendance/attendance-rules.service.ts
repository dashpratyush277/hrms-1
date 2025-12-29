import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AttendanceStatus, AttendancePolicy, Attendance } from '@prisma/client';

@Injectable()
export class AttendanceRulesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get employee's attendance policy
   */
  async getEmployeePolicy(employeeId: string, tenantId: string): Promise<AttendancePolicy | null> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: { attendancePolicy: true },
    });

    if (employee?.attendancePolicy) {
      return employee.attendancePolicy;
    }

    // Get default policy for tenant
    const defaultPolicy = await this.prisma.attendancePolicy.findFirst({
      where: { tenantId, isDefault: true },
    });

    return defaultPolicy;
  }

  /**
   * Evaluate attendance status based on policy rules
   */
  evaluateAttendanceStatus(
    attendance: Attendance,
    policy: AttendancePolicy | null,
  ): {
    status: AttendanceStatus;
    regularHours: number;
    overtimeHours: number;
    isLate: boolean;
    isEarlyLeave: boolean;
  } {
    if (!attendance.checkInTime || !attendance.checkOutTime) {
      return {
        status: AttendanceStatus.ABSENT,
        regularHours: 0,
        overtimeHours: 0,
        isLate: false,
        isEarlyLeave: false,
      };
    }

    if (!policy) {
      // Default evaluation without policy
      const totalMinutes = (attendance.checkOutTime.getTime() - attendance.checkInTime.getTime()) / (1000 * 60);
      const totalHours = totalMinutes / 60;
      return {
        status: totalHours >= 4 ? AttendanceStatus.PRESENT : AttendanceStatus.HALF_DAY,
        regularHours: Math.min(totalHours, 8),
        overtimeHours: Math.max(0, totalHours - 8),
        isLate: false,
        isEarlyLeave: false,
      };
    }

    const checkInTime = new Date(attendance.checkInTime);
    const checkOutTime = new Date(attendance.checkOutTime);
    const attendanceDate = new Date(attendance.date);
    
    // Parse shift times
    const [shiftStartHour, shiftStartMin] = policy.shiftStartTime.split(':').map(Number);
    const [shiftEndHour, shiftEndMin] = policy.shiftEndTime.split(':').map(Number);
    
    const shiftStart = new Date(attendanceDate);
    shiftStart.setHours(shiftStartHour, shiftStartMin, 0, 0);
    
    const shiftEnd = new Date(attendanceDate);
    shiftEnd.setHours(shiftEndHour, shiftEndMin, 0, 0);

    // Calculate time differences in minutes
    const checkInDiffMinutes = (checkInTime.getTime() - shiftStart.getTime()) / (1000 * 60);
    const checkOutDiffMinutes = (checkOutTime.getTime() - shiftEnd.getTime()) / (1000 * 60);
    const totalMinutes = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60);
    const totalHours = totalMinutes / 60;

    // Check if late
    const isLate = checkInDiffMinutes > policy.gracePeriodMinutes + (policy.lateComingThreshold || 0);
    
    // Check if early leave
    const isEarlyLeave = checkOutDiffMinutes < -(policy.gracePeriodMinutes + (policy.earlyLeavingThreshold || 0));

    // Determine status
    let status: AttendanceStatus = AttendanceStatus.PRESENT;
    
    if (totalHours < policy.halfDayThreshold / 60) {
      status = AttendanceStatus.HALF_DAY;
    } else if (isLate) {
      status = AttendanceStatus.LATE;
    } else if (isEarlyLeave) {
      status = AttendanceStatus.EARLY_LEAVE;
    } else if (checkInDiffMinutes <= policy.gracePeriodMinutes && checkOutDiffMinutes >= -policy.gracePeriodMinutes) {
      status = AttendanceStatus.ON_TIME;
    }

    // Calculate regular and overtime hours
    const regularHours = Math.min(totalHours, policy.overtimeThreshold / 60);
    const overtimeHours = policy.overtimeEnabled 
      ? Math.max(0, totalHours - (policy.overtimeThreshold / 60))
      : 0;

    return {
      status,
      regularHours,
      overtimeHours,
      isLate,
      isEarlyLeave,
    };
  }

  /**
   * Check if date is a workday according to policy
   */
  isWorkday(date: Date, policy: AttendancePolicy | null): boolean {
    if (!policy) return true; // Default: all days are workdays

    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const workdayMap: { [key: number]: string } = {
      0: 'SUNDAY',
      1: 'MONDAY',
      2: 'TUESDAY',
      3: 'WEDNESDAY',
      4: 'THURSDAY',
      5: 'FRIDAY',
      6: 'SATURDAY',
    };

    return policy.workdays.includes(workdayMap[dayOfWeek] as any);
  }

  /**
   * Validate GPS coordinates for FIELD mode
   */
  validateFieldMode(latitude?: number, longitude?: number, mode?: string): void {
    if (mode === 'FIELD') {
      if (!latitude || !longitude) {
        throw new Error('GPS coordinates are mandatory for FIELD mode');
      }
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error('Invalid GPS coordinates');
      }
    }
  }
}

