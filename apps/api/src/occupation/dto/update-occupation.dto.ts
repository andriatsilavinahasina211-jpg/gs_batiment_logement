import { PartialType } from '@nestjs/swagger';
import { CreateOccupationDto } from './create-occupation.dto';
import { IsEnum, IsOptional, IsBoolean, IsString } from 'class-validator';
import { OccupationStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOccupationDto extends PartialType(CreateOccupationDto) {
  @ApiPropertyOptional({ enum: OccupationStatus })
  @IsOptional()
  @IsEnum(OccupationStatus)
  statut?: OccupationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  clesRestituees?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motifLiberation?: string;
}
