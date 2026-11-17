import { IsInt, IsOptional, IsString, IsDateString, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatutTravaux } from '@prisma/client';

export class UpdateAvancementDto {
  @ApiPropertyOptional({ description: "Pourcentage d'avancement (0-100)", minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  avancementPourcent?: number;

  @ApiPropertyOptional({ enum: StatutTravaux, description: "Nouveau statut des travaux" })
  @IsOptional()
  @IsEnum(StatutTravaux)
  statut?: StatutTravaux;

  @ApiPropertyOptional({ description: "Commentaire sur l'avancement" })
  @IsOptional()
  @IsString()
  commentaire?: string;

  @ApiPropertyOptional({ description: "Date de début réelle" })
  @IsOptional()
  @IsDateString()
  dateDebutReelle?: string;

  @ApiPropertyOptional({ description: "Date de fin réelle (si travaux terminés)" })
  @IsOptional()
  @IsDateString()
  dateFinReelle?: string;

  @ApiPropertyOptional({ description: "Montant réel final (Ar)" })
  @IsOptional()
  @IsNumber()
  montantReel?: number;

  @ApiPropertyOptional({ description: "Nouvelles observations" })
  @IsOptional()
  @IsString()
  observations?: string;
}
