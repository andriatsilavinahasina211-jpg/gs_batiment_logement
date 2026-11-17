import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBailDto {
  @ApiProperty({ example: 'BIEN-001' })
  @IsString()
  bienNumero!: string;

  @ApiProperty({ example: 5, description: "ID de l'Occupant (locataire)" })
  @Type(() => Number)
  @IsNumber()
  locataireId!: number;

  /** Lien Demande — optionnel si création directe hors module Demandes */
  @ApiPropertyOptional({ example: 'DEM-E026149E' })
  @IsOptional()
  @IsString()
  demandeReference?: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  dateDebut!: string;

  @ApiProperty({ example: '2027-07-31' })
  @IsDateString()
  dateFin!: string;

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  montantLoyer?: number;

  @ApiPropertyOptional({ example: 'Jean Dupont' })
  @IsOptional()
  @IsString()
  nomBailleur?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  nifBailleur?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @IsString()
  statBailleur?: string;

  @ApiPropertyOptional({ example: 'MG48 1000 2000 3000 4000' })
  @IsOptional()
  @IsString()
  ribBailleur?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  estAvenantOuRenouvellement?: boolean;
}