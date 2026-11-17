import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOccupantDto {
  @ApiProperty({ example: '123.456', description: 'Matricule Solde' })
  @IsString()
  matricule!: string;

  @ApiProperty({ example: 'RABEMANANJARA' })
  @IsString()
  nom!: string;

  @ApiProperty({ example: 'Jean Jean' })
  @IsString()
  prenom!: string;

  @ApiPropertyOptional({ example: '201011023456' })
  @IsOptional()
  @IsString()
  cin?: string;

  @ApiPropertyOptional({ example: '034 12 345 67' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional({ example: "Ministère de l'Éducation Nationale" })
  @IsOptional()
  @IsString()
  ministere?: string;

  @ApiPropertyOptional({ example: 'Enseignant' })
  @IsOptional()
  @IsString()
  fonction?: string;
}
