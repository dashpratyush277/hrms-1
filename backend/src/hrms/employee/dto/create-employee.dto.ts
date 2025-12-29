import { IsString, IsEmail, IsOptional, IsDateString, IsUUID, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmploymentType } from '@prisma/client';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty()
  @IsDateString()
  dateOfJoining: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  pan?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  aadhaar?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  pfNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  esiNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  uan?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bankIFSC?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  emergencyPhone?: string;

  @ApiProperty({ enum: EmploymentType, required: false, default: EmploymentType.FULL_TIME })
  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  designationId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  designation?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  reportingManagerId?: string;

  @ApiProperty({ required: false, description: 'Password for user account. If not provided, a default password will be set.' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiProperty({ enum: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'], required: false, default: 'EMPLOYEE' })
  @IsString()
  @IsOptional()
  userRole?: string;
}

