import { IsDateString, IsOptional, IsString, IsArray, ValidateNested, IsUUID, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class RouteItemDto {
  @ApiProperty()
  @IsUUID()
  doctorId: string;

  @ApiProperty({ required: false })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  plannedTime?: Date;
}

export class CreateRoutePlanDto {
  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty({ type: [RouteItemDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteItemDto)
  @IsOptional()
  items?: RouteItemDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

