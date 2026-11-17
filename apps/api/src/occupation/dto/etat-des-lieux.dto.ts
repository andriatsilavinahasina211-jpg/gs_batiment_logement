import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsIn,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PieceEtatDesLieuxDto {
  @IsString()
  @IsNotEmpty()
  designation!: string;

  /** 1 = Bon, 2 = Moyen, 3 = Nécessite entretien */
  @IsNumber()
  @IsIn([1, 2, 3])
  etat!: number;

  @IsArray()
  @IsString({ each: true })
  caracteristiques!: string[];
}

export class EtatDesLieuxDto {
  @IsOptional()
  @IsString()
  numeroOccupation?: string;

  @IsIn(['ENTREE', 'SORTIE'])
  type!: 'ENTREE' | 'SORTIE';

  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsNotEmpty()
  lieu!: string;

  @IsOptional()
  @IsString()
  descriptionBien?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PieceEtatDesLieuxDto) // ← indispensable
  pieces!: PieceEtatDesLieuxDto[];

  @IsOptional()
  @IsString()
  observationsGenerales?: string;

  @IsString()
  @IsNotEmpty()
  signataireBailleur!: string;

  @IsString()
  @IsNotEmpty()
  signataireAdministration!: string;
}