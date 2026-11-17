import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { get } from 'http';

@ApiTags('Utilisateurs Système')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister tous les utilisateurs (Admin uniquement)' })
  findAll() {
    return this.userService.findAll();
  }

  @Post('admin-test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Créer/Réinitialiser l\'utilisateur administrateur de test' })
  async seedAdminTest() {
    return this.userService.createTestAdmin();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail d\'un utilisateur (Admin uniquement)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR')
  @ApiOperation({ summary: 'Créer un nouvel utilisateur' })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR')
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR')
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }

  @Post('reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Réinitialiser le mot de passe d\'un utilisateur (Admin uniquement)' })
  resetPassword(@Body() body: { email: string; newPassword: string }) {
    const { email, newPassword } = body;
    return this.userService.resetPassword(email, newPassword);
  }

  @Get('findAll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trouver tous les utilisateurs' })
  findAllUsers() {
    return this.userService.findAll();
  }
}
