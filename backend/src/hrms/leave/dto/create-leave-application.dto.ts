import { IsDateString, IsString, IsUUID, IsOptional, IsBoolean, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeaveApplicationDto {
  @ApiProperty()
  @IsUUID()
  leaveTypeId: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isHalfDay?: boolean;

  @ApiProperty({ required: false, enum: ['FIRST_HALF', 'SECOND_HALF'] })
  @IsEnum(['FIRST_HALF', 'SECOND_HALF'])
  @IsOptional()
  halfDayType?: string;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiProperty({ type: [String], required: false, description: 'URLs to attachment files' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}

export class UpdateLeaveApplicationDto {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isHalfDay?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}

