import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { LeavePolicyService } from './leave-policy.service';
import { LeavePolicyController } from './leave-policy.controller';
import { LeaveTypeController } from './leave-type.controller';
import { LeaveTypeService } from './leave-type.service';
import { LeaveBalanceService } from './leave-balance.service';
import { LeaveAccrualService } from './leave-accrual.service';
import { SecurityModule } from '../../security/security.module';

@Module({
  imports: [SecurityModule],
  controllers: [LeaveController, LeavePolicyController, LeaveTypeController],
  providers: [LeaveService, LeavePolicyService, LeaveTypeService, LeaveBalanceService, LeaveAccrualService],
  exports: [LeaveService, LeavePolicyService, LeaveTypeService, LeaveBalanceService, LeaveAccrualService],
})
export class LeaveModule {}

