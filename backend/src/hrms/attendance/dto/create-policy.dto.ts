import { IsString, IsBoolean, IsInt, IsArray, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShiftType, Workday } from '@prisma/client';

export class CreateAttendancePolicyDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({ type: [String], enum: Workday })
  @IsArray()
  @IsEnum(Workday, { each: true })
  workdays: Workday[];

  @ApiProperty({ enum: ShiftType, default: ShiftType.GENERAL })
  @IsEnum(ShiftType)
  @IsOptional()
  shiftType?: ShiftType;

  @ApiProperty({ example: '09:00', description: 'Shift start time in HH:mm format' })
  @IsString()
  shiftStartTime: string;

  @ApiProperty({ example: '18:00', description: 'Shift end time in HH:mm format' })
  @IsString()
  shiftEndTime: string;

  @ApiProperty({ required: false, default: 15, description: 'Grace period in minutes' })
  @IsInt()
  @Min(0)
  @IsOptional()
  gracePeriodMinutes?: number;

  @ApiProperty({ required: false, default: 0, description: 'Late coming threshold in minutes' })
  @IsInt()
  @Min(0)
  @IsOptional()
  lateComingThreshold?: number;

  @ApiProperty({ required: false, default: 0, description: 'Early leaving threshold in minutes' })
  @IsInt()
  @Min(0)
  @IsOptional()
  earlyLeavingThreshold?: number;

  @ApiProperty({ required: false, default: 240, description: 'Half-day threshold in minutes' })
  @IsInt()
  @Min(0)
  @IsOptional()
  halfDayThreshold?: number;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  overtimeEnabled?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  overtimeApprovalRequired?: boolean;

  @ApiProperty({ required: false, default: 480, description: 'Overtime threshold in minutes' })
  @IsInt()
  @Min(0)
  @IsOptional()
  overtimeThreshold?: number;
}

