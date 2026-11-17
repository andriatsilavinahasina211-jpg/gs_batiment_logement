import {
  IsDateString,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OccupationStatus } from '@prisma/client';

export class CreateOccupationDto {
  // Généré automatiquement côté service → ne pas envoyer
  // numeroOccupation?: string;

  @IsDateString()
  dateEntree!: string;

  @IsOptional()
  @IsDateString()
  dateSortiePrevue?: string;

  @IsOptional()
  @IsEnum(OccupationStatus)
  statut?: OccupationStatus; // défaut = EN_ATTENTE dans le service

  @IsString()
  @IsNotEmpty()
  bienNumero!: string;

  /** ID Occupant (occupanId). Si absent → pris du token user */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  demandeurId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  occupantId?: number;

  @IsOptional()
  @IsString()
  demandeReference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  delaiJouissanceMois?: number;

  @IsOptional()
  @IsString()
  motifLiberation?: string;

  @IsOptional()
  @IsBoolean()
  clesRestituees?: boolean;

  @IsOptional()
  @IsBoolean()
  procedureJudiciaire?: boolean;

  @IsOptional()
  @IsString()
  occupantSansTitre?: string;
}