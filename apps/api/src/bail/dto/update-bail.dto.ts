import { PartialType } from '@nestjs/swagger';
import { CreateBailDto } from './create-bail.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { StatutBail } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBailDto extends PartialType(CreateBailDto) {
  @ApiPropertyOptional({ enum: StatutBail })
  @IsOptional()
  @IsEnum(StatutBail)
  statut?: StatutBail;
}
