import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { TypeBien, StatutBien, EtatBatisse } from '@prisma/client';
import { Transform } from 'class-transformer';

export class BienQueryDto {
  @IsOptional()
  @IsString()
  search?: string;                    // Recherche globale (numéro, nom, adresse...)

  @IsOptional()
  @IsEnum(TypeBien)
  typeBien?: TypeBien;

  @IsOptional()
  @IsEnum(StatutBien)
  statut?: StatutBien;

  @IsOptional()
  @IsEnum(EtatBatisse)
  etatBatisse?: EtatBatisse;

  @IsOptional()
  @IsString()
  localite?: string;

  @IsOptional()
  @IsString()
  utilisateurDuBien?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasOccupation?: boolean;            // Biens occupés ou non

  // Tri
  @IsOptional()
  @IsString()
  orderBy?: 'numeroBien' | 'nomDuBien' | 'createdAt' = 'numeroBien';

  @IsOptional()
  @IsString()
  orderDirection?: 'asc' | 'desc' = 'asc';

  // Pagination
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}