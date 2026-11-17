import { IsArray, IsBoolean, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChecklistItemDto {
  @ApiProperty({ example: 'NOTE_PRESENTATION' })
  @IsString()
  type!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  fourni!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fichierUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentaire?: string;

  @ApiPropertyOptional({ example: '2026-06-01', description: 'Date d\'émission du document (ex: CISJ < 3 mois)' })
  @IsOptional()
  @IsDateString()
  dateEmission?: string;
}

export class UpdateChecklistDto {
  @ApiProperty({ type: [ChecklistItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  items!: ChecklistItemDto[];
}