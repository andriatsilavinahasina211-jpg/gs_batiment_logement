import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TypeTravaux, StatutTravaux } from '@prisma/client';

export class UpdateTravauxDto {
  @ApiPropertyOptional({ description: "Numéro du bien concerné" })
  @IsOptional()
  @IsString()
  bienNumero?: string;

  @ApiPropertyOptional({ enum: TypeTravaux, description: "Type de travaux" })
  @IsOptional()
  @IsEnum(TypeTravaux)
  typeTravaux?: TypeTravaux;

  @ApiPropertyOptional({ description: "Date de début prévue" })
  @IsOptional()
  @IsDateString()
  dateDebutPrevue?: string;

  @ApiPropertyOptional({ description: "Date de fin prévue" })
  @IsOptional()
  @IsDateString()
  dateFinPrevue?: string;

  @ApiPropertyOptional({ description: "Date de début réelle" })
  @IsOptional()
  @IsDateString()
  dateDebutReelle?: string;

  @ApiPropertyOptional({ description: "Date de fin réelle" })
  @IsOptional()
  @IsDateString()
  dateFinReelle?: string;

  @ApiPropertyOptional({ description: "Montant estimatif (Ar)" })
  @IsOptional()
  @IsNumber()
  montantEstimatif?: number;

  @ApiPropertyOptional({ description: "Montant réel (Ar)" })
  @IsOptional()
  @IsNumber()
  montantReel?: number;

  @ApiPropertyOptional({ enum: StatutTravaux, description: "Statut des travaux" })
  @IsOptional()
  @IsEnum(StatutTravaux)
  statut?: StatutTravaux;

  @ApiPropertyOptional({ description: "Pourcentage d'avancement (0-100)", minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  avancementPourcent?: number;

  @ApiPropertyOptional({ description: "Référence du devis" })
  @IsOptional()
  @IsString()
  referenceDevis?: string;

  @ApiPropertyOptional({ description: "Observations" })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({ description: "Autorisation DPE" })
  @IsOptional()
  @IsBoolean()
  autorisationDpe?: boolean;

  @ApiPropertyOptional({ description: "Commentaire d'historique" })
  @IsOptional()
  @IsString()
  commentaire?: string;
}
