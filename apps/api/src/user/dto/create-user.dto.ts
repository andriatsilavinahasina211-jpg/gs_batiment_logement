import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'Dupont' })
  @IsString()
  nom!: string;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  prenom!: string;

  @ApiProperty({ example: 'jean.dupont@srbhm.mg' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'Secret123!' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: 'MAT-1234' })
  @IsOptional()
  @IsString()
  matricule?: string;

  @ApiPropertyOptional({ enum: Role, default: Role.AGENT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
