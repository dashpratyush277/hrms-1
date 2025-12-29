import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { EmployeeModule } from './hrms/employee/employee.module';
import { AttendanceModule } from './hrms/attendance/attendance.module';
import { LeaveModule } from './hrms/leave/leave.module';
import { PayrollModule } from './hrms/payroll/payroll.module';
import { DoctorModule } from './field-force/doctor/doctor.module';
import { VisitModule } from './field-force/visit/visit.module';
import { RoutePlanModule } from './field-force/route-plan/route-plan.module';
import { TaskModule } from './field-force/task/task.module';
import { CampaignModule } from './field-force/campaign/campaign.module';
import { SecurityModule } from './security/security.module';
import { AuditModule } from './security/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    TenantModule,
    EmployeeModule,
    AttendanceModule,
    LeaveModule,
    PayrollModule,
    DoctorModule,
    VisitModule,
    RoutePlanModule,
    TaskModule,
    CampaignModule,
    SecurityModule,
    AuditModule,
  ],
})
export class AppModule {}

