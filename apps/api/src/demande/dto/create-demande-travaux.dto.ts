import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TypeTravaux } from '@prisma/client';

export class CreateDemandeTravauxDto {
  @IsEnum(TypeTravaux)
  typeTravaux!: TypeTravaux;

  @IsDateString()
  dateDebutPrevue!: string;

  @IsDateString()
  dateFinPrevue!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montantEstimatif?: number;

  @IsOptional()
  @IsString()
  observations?: string;
}
