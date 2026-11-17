import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TravauxService } from './travaux.service';
import { CreateTravauxDto } from './dto/create-travaux.dto';
import { UpdateAvancementDto } from './dto/update-avancement.dto';
import { UpdateTravauxDto } from './dto/update-travaux.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { StatutTravaux } from '@prisma/client';

@ApiTags('Travaux')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard/travaux')
export class TravauxController {
  constructor(private readonly travauxService: TravauxService) {}

  @Post()
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Enregistrer un nouveau chantier (BF-TRAV-01)' })
  create(@Body() dto: CreateTravauxDto, @Request() req) {
    const userId = Number(req.user?.id ?? req.user?.userId ?? req.user?.sub ?? 1);
    return this.travauxService.create(dto, userId);
  }

  @Get()
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Lister tous les travaux (BF-TRAV-06)' })
  @ApiQuery({ name: 'statut', required: false, enum: StatutTravaux })
  @ApiQuery({ name: 'bienNumero', required: false })
  @ApiQuery({ name: 'retardSeulement', required: false, type: Boolean })
  findAll(
    @Query('statut') statut?: StatutTravaux,
    @Query('bienNumero') bienNumero?: string,
    @Query('retardSeulement') retardSeulement?: string,
  ) {
    return this.travauxService.findAll({
      statut,
      bienNumero,
      retardSeulement: retardSeulement === 'true',
    });
  }

  @Get('en-retard')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Lister les travaux en retard (BF-TRAV-04)' })
  getTravauxEnRetard() {
    return this.travauxService.getTravauxEnRetard();
  }

  @Get('sans-quitus-n1')
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Lister les travaux sans Quitus N-1 (non conformité Circulaire N°813)' })
  getTravauxSansQuitusN1() {
    return this.travauxService.getTravauxSansQuitusN1();
  }

  @Get(':id')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Détail d\'un chantier avec historique (BF-TRAV-02)' })
  findOne(@Param('id') id: string) {
    return this.travauxService.findOne(id);
  }

  @Patch(':id/avancement')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Mettre à jour l\'avancement d\'un chantier (BF-TRAV-02)' })
  updateAvancement(
    @Param('id') id: string,
    @Body() dto: UpdateAvancementDto,
    @Request() req,
  ) {
    const userId = Number(req.user?.id ?? req.user?.userId ?? req.user?.sub ?? 1);
    return this.travauxService.updateAvancement(id, dto, userId);
  }

  @Patch(':id')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Modifier un chantier (BF-TRAV-02)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTravauxDto,
    @Request() req,
  ) {
    const userId = Number(req.user?.id ?? req.user?.userId ?? req.user?.sub ?? 1);
    return this.travauxService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Supprimer un chantier' })
  remove(@Param('id') id: string) {
    return this.travauxService.remove(id);
  }

  @Get(':id/historique')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Historique complet d\'un chantier (BF-TRAV-02)' })
  getHistorique(@Param('id') id: string) {
    return this.travauxService.getHistorique(id);
  }
}
