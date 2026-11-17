import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TypeAttestation } from '@prisma/client';

export class CreateAttestationDto {
  @ApiProperty({ enum: TypeAttestation, example: 'NON_LOGEMENT' })
  @IsEnum(TypeAttestation)
  typeAttestation!: TypeAttestation;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  demandeurId!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  visaSuperieur!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  declarationHonneurLegalisee!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentaire?: string;

  @ApiPropertyOptional({ example: 'Monsieur' })
  @IsOptional()
  @IsString()
  civilite?: string;

  @ApiPropertyOptional({ example: '2025-1346' })
  @IsOptional()
  @IsString()
  decretNumero?: string;

  @ApiPropertyOptional({ example: '2025-12-08' })
  @IsOptional()
  @IsString()
  decretDate?: string;

  @ApiPropertyOptional({ example: '2025-12-08' })
  @IsOptional()
  @IsString()
  datePriseService?: string;

  @ApiPropertyOptional({ example: '404' })
  @IsOptional()
  @IsString()
  numeroOrdre?: string;
}