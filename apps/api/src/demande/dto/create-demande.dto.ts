import {
  IsDefined,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TypeDemande, StatutDemande } from '@prisma/client';
import { CreateDemandeTravauxDto } from './create-demande-travaux.dto';
import { CreateDemandeRecensementDto } from './create-demande-recensement.dto';

export class CreateDemandeDto {
  @ApiProperty({ enum: TypeDemande, example: 'OCCUPATION' })
  @IsEnum(TypeDemande)
  typeDemande!: TypeDemande;

  @ApiPropertyOptional({
    enum: StatutDemande,
    example: 'EN_ATTENTE',
    description: 'Défaut EN_ATTENTE si omis',
  })
  @IsOptional()
  @IsEnum(StatutDemande, {
    message:
      'statut must be one of the following values: EN_ATTENTE, EN_COURS, VALIDEE, REJETEE, TERMINEE',
  })
  statut?: StatutDemande;

  @ApiPropertyOptional({
    example: "Demande d'attribution de logement de fonction",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motif?: string;

  @ApiProperty({ example: 1, description: "ID de l'Occupant demandeur" })
  @IsNumber()
  demandeurId!: number;

  @ApiPropertyOptional({ example: 'BIEN-001' })
  @IsOptional()
  @IsString()
  bienNumero?: string;

  @ApiPropertyOptional({ type: CreateDemandeTravauxDto })
  @ValidateIf((demande: CreateDemandeDto) => demande.typeDemande === TypeDemande.TRAVAUX)
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateDemandeTravauxDto)
  travaux?: CreateDemandeTravauxDto;

  @ApiPropertyOptional({ type: CreateDemandeRecensementDto })
  @ValidateIf(
    (demande: CreateDemandeDto) =>
      demande.typeDemande === TypeDemande.RECENSEMENT,
  )
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateDemandeRecensementDto)
  recensement?: CreateDemandeRecensementDto;
}
