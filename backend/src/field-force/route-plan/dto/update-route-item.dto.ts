import { IsDateString, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRouteItemDto {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  actualTime?: string;

  @ApiProperty({ required: false })
  @IsEnum(['PENDING', 'VISITED', 'SKIPPED'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

