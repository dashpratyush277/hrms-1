import { IsUUID, IsDateString, IsOptional, IsNumber, IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVisitDto {
  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @ApiProperty()
  @IsDateString()
  visitDate: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  startLat?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  startLng?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  startAddress?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}

