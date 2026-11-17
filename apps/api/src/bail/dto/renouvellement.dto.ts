import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RenouvellementDto {
  @ApiProperty({ example: '2027-08-01' })
  @IsDateString()
  nouvelleDateDebut!: string;

  @ApiProperty({ example: '2028-07-31' })
  @IsDateString()
  nouvelleDateFin!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  nouveauMontantLoyer?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motif?: string;
}