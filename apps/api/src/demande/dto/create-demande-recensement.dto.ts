import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EtatBatisse } from '@prisma/client';

export class CreateDemandeRecensementDto {
  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  annee!: number;

  @ApiPropertyOptional({ enum: EtatBatisse })
  @IsOptional()
  @IsEnum(EtatBatisse)
  etatBatiment?: EtatBatisse;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}
