import { Module } from '@nestjs/common';
import { RoutePlanService } from './route-plan.service';
import { RoutePlanController } from './route-plan.controller';

@Module({
  controllers: [RoutePlanController],
  providers: [RoutePlanService],
  exports: [RoutePlanService],
})
export class RoutePlanModule {}

