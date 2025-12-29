import { IsNumber, IsDateString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSalaryStructureDto {
  @ApiProperty()
  @IsNumber()
  basicSalary: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  hra?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  specialAllowance?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  transportAllowance?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  medicalAllowance?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  otherAllowances?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  providentFund?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  professionalTax?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  incomeTax?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  otherDeductions?: number;

  @ApiProperty()
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}

