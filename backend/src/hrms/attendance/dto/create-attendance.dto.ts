import { IsDateString, IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AttendanceMode } from '@prisma/client';

export class CreateAttendanceDto {
  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  checkInTime?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  checkOutTime?: string;

  @ApiProperty({ enum: AttendanceMode, required: false })
  @IsEnum(AttendanceMode)
  @IsOptional()
  mode?: AttendanceMode;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

