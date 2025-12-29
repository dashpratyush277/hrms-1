import { IsString, IsBoolean, IsOptional, IsInt, IsArray, IsEnum, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccrualType } from '@prisma/client';

export class CreateLeavePolicyDto {
  @ApiProperty()
  @IsString()
  leaveTypeId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: AccrualType, default: AccrualType.ANNUAL })
  @IsEnum(AccrualType)
  @IsOptional()
  accrualType?: AccrualType;

  @ApiProperty({ description: 'Days accrued per accrual period' })
  @IsInt()
  @Min(0)
  accrualDays: number;

  @ApiProperty({ required: false, default: 12, description: 'Accrual period in months' })
  @IsInt()
  @Min(1)
  @IsOptional()
  accrualPeriod?: number;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  proratedForJoiners?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  carryForwardEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  carryForwardLimit?: number;

  @ApiProperty({ required: false, description: 'Days after which carry-forward expires' })
  @IsInt()
  @Min(0)
  @IsOptional()
  carryForwardExpiry?: number;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  encashmentEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  encashmentLimit?: number;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  lapsingEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  lapsingDate?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  locationFilter?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  gradeFilter?: string[];

  @ApiProperty()
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

