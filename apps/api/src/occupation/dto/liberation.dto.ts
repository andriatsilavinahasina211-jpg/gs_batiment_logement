import { IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export class DemandeLiberationDto {
  @IsOptional()
  @IsString()
  demandeReference?: string;

  @IsOptional()
  @IsString()
  motifLiberation?: string;

  @IsOptional()
  @IsDateString()
  dateSortieSouhaitee?: string;
}

export class ValiderLiberationDto {
  @IsBoolean()
  clesRestituees!: boolean;

  @IsOptional()
  @IsDateString()
  dateSortieReelle?: string;
}