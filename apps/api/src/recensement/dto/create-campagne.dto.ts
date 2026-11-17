import { IsInt, IsDateString, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampagneDto {
  @ApiProperty({ description: "Année du recensement (ex: 2026)", example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  annee!: number;

  @ApiProperty({ description: "Date d'ouverture de la campagne" })
  @IsDateString()
  dateOuverture!: string;

  @ApiPropertyOptional({ description: "Date de clôture (limite réglementaire : 30 juin)" })
  @IsOptional()
  @IsDateString()
  dateCloture?: string;

  @ApiPropertyOptional({ description: "Description ou note de la campagne" })
  @IsOptional()
  @IsString()
  description?: string;
}
