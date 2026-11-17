import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccordMefDto {
  @ApiProperty({ example: 'ACCORD-MEF-2026-089' })
  @IsString()
  refAccordMef!: string;

  @ApiPropertyOptional({ example: '2026-08-02' })
  @IsOptional()
  @IsDateString()
  dateAccordMef?: string;
}

export class VisaCfDto {
  @ApiProperty({ example: 'VISA-CF-2026-442' })
  @IsString()
  refVisaCf!: string;

  @ApiPropertyOptional({ example: '2026-08-04' })
  @IsOptional()
  @IsDateString()
  dateVisaCf?: string;
}

export class EnregistrementFiscalDto {
  @ApiProperty({ example: 'FISCAL-FNT-2026-99' })
  @IsString()
  refEnregistrementFiscal!: string;

  @ApiPropertyOptional({ example: '2026-08-05' })
  @IsOptional()
  @IsDateString()
  dateEnregistrementFiscal?: string;
}
