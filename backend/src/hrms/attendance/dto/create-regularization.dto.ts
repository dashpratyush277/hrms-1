import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RegularizationType, AttendanceStatus } from '@prisma/client';

export class CreateRegularizationDto {
  @ApiProperty({ description: 'Attendance ID to regularize' })
  @IsString()
  attendanceId: string;

  @ApiProperty({ enum: RegularizationType })
  @IsEnum(RegularizationType)
  type: RegularizationType;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  requestedCheckIn?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  requestedCheckOut?: string;

  @ApiProperty({ enum: AttendanceStatus, required: false })
  @IsEnum(AttendanceStatus)
  @IsOptional()
  requestedStatus?: AttendanceStatus;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiProperty({ required: false, description: 'URL to attachment file' })
  @IsString()
  @IsOptional()
  attachmentUrl?: string;
}

export class ApproveRegularizationDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  comments?: string;
}

export class RejectRegularizationDto {
  @ApiProperty()
  @IsString()
  rejectionReason: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  comments?: string;
}

