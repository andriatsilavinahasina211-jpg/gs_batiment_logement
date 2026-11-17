import { IsEnum, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TypeAvenant } from '@prisma/client';

export class CreateAvenantDto {
  @ApiProperty({ enum: TypeAvenant, example: 'MODIFICATION_LOYER' })
  @IsEnum(TypeAvenant)
  typeAvenant!: TypeAvenant;

  @ApiPropertyOptional({ example: 'Augmentation du loyer suite à décision administrative' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @IsNumber()
  nouveauMontant?: number;

  @ApiPropertyOptional({ example: '2028-07-31' })
  @IsOptional()
  @IsDateString()
  nouvelleDateFin?: string;
}