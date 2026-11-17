import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { TypeBien, StatutBien, EtatBatisse, NatureBien } from '@prisma/client';

export class CreateBienDto {
  @IsOptional()
  @IsString()
  numeroBien?: string;

  @IsString()
  nomDuBien!: string;

  @IsEnum(TypeBien)
  typeBien!: TypeBien;

  @IsOptional()
  @IsEnum(EtatBatisse)
  etatBatisse?: EtatBatisse = EtatBatisse.BON;

  @IsString()
  adresse!: string;

  @IsOptional()
  @IsString()
  localite?: string;

  @IsOptional()
  @IsEnum(StatutBien)
  statut?: StatutBien = StatutBien.LIBRE;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[] = [];

  @IsOptional()
  @IsString()
  utilisateurDuBien?: string;

  @IsOptional()
  @IsEnum(NatureBien)
  nature?: NatureBien;

  @IsOptional()
  @IsString()
  description?: string;
}