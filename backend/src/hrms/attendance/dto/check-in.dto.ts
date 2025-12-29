import { IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AttendanceMode } from '@prisma/client';

export class CheckInDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ enum: AttendanceMode, default: AttendanceMode.OFFICE })
  @IsEnum(AttendanceMode)
  @IsOptional()
  mode?: AttendanceMode;

  @ApiProperty({ required: false, description: 'Base64 encoded photo or URL' })
  @IsString()
  @IsOptional()
  photo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  devicePlatform?: string;

  @ApiProperty({ required: false, description: 'Additional device metadata as JSON' })
  @IsOptional()
  deviceInfo?: any;
}

