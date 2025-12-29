import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendancePolicyController } from './attendance-policy.controller';
import { RegularizationController } from './regularization.controller';
import { AttendanceRulesService } from './attendance-rules.service';
import { AttendancePolicyService } from './attendance-policy.service';
import { RegularizationService } from './regularization.service';
import { SecurityModule } from '../../security/security.module';

@Module({
  imports: [SecurityModule],
  controllers: [
    AttendanceController,
    AttendancePolicyController,
    RegularizationController,
  ],
  providers: [
    AttendanceService,
    AttendanceRulesService,
    AttendancePolicyService,
    RegularizationService,
  ],
  exports: [
    AttendanceService,
    AttendanceRulesService,
    AttendancePolicyService,
    RegularizationService,
  ],
})
export class AttendanceModule {}

