import { IsString, IsInt, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EtatBatisse } from '@prisma/client';

export class CreateQuitusDto {
  @ApiProperty({ description: "Numéro du bien concerné" })
  @IsString()
  bienNumero!: string;

  @ApiProperty({ description: "ID de la campagne de recensement" })
  @IsString()
  campagneId!: string;

  @ApiPropertyOptional({ description: "ID de l'occupant actuel (si logé)" })
  @IsOptional()
  @IsInt()
  occupantId?: number;

  @ApiPropertyOptional({ enum: EtatBatisse, description: "État de la bâtisse au moment du recensement" })
  @IsOptional()
  @IsEnum(EtatBatisse)
  etatBatiment?: EtatBatisse;

  @ApiPropertyOptional({ description: "Observations / remarques" })
  @IsOptional()
  @IsString()
  observations?: string;
}
