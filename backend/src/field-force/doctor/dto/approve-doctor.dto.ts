import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DoctorStatus } from '@prisma/client';

export class ApproveDoctorDto {
  @ApiProperty({ enum: DoctorStatus })
  @IsEnum(DoctorStatus)
  status: DoctorStatus;
}

