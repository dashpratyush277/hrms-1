import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EndVisitDto {
  @ApiProperty()
  @IsNumber()
  endLat: number;

  @ApiProperty()
  @IsNumber()
  endLng: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  endAddress?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  attachments?: string[];
}

