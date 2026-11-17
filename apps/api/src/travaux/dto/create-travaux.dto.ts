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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TypeTravaux } from '@prisma/client';

export class CreateTravauxDto {
  @ApiProperty({ description: "Numéro du bien concerné" })
  @IsString()
  bienNumero!: string;

  @ApiProperty({ enum: TypeTravaux, description: "Type de travaux" })
  @IsEnum(TypeTravaux)
  typeTravaux!: TypeTravaux;

  @ApiProperty({ description: "Date de début prévue" })
  @IsDateString()
  dateDebutPrevue!: string;

  @ApiProperty({ description: "Date de fin prévue" })
  @IsDateString()
  dateFinPrevue!: string;

  @ApiPropertyOptional({ description: "Montant estimatif (Ar)" })
  @IsOptional()
  @IsNumber()
  montantEstimatif?: number;

  @ApiPropertyOptional({ description: "Référence du devis" })
  @IsOptional()
  @IsString()
  referenceDevis?: string;

  @ApiPropertyOptional({ description: "Observations initiales" })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({ description: "Autorisation DPE pour modification structurelle" })
  @IsOptional()
  @IsBoolean()
  autorisationDpe?: boolean;
}
