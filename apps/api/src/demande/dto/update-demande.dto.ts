import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDemandeDto } from './create-demande.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { StatutDemande } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDemandeDto extends PartialType(
  OmitType(CreateDemandeDto, ['travaux'] as const),
) {
  @ApiPropertyOptional({ enum: StatutDemande })
  @IsOptional()
  @IsEnum(StatutDemande)
  statut?: StatutDemande;
}
