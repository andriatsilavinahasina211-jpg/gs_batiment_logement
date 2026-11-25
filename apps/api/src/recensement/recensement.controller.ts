import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Patch,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RecensementService } from './recensement.service';
import { CreateCampagneDto } from './dto/create-campagne.dto';
import { CreateQuitusDto } from './dto/create-quitus.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Recensement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard/recensement')
export class RecensementController {
  constructor(private readonly recensementService: RecensementService) {}

  // ==================== CAMPAGNES ====================

  @Post('campagnes')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Créer une nouvelle campagne de recensement' })
  createCampagne(@Body() dto: CreateCampagneDto) {
    return this.recensementService.createCampagne(dto);
  }

  @Get('campagnes')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Lister toutes les campagnes de recensement' })
  findAllCampagnes() {
    return this.recensementService.findAllCampagnes();
  }

  @Get('campagnes/:id')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Détail d\'une campagne avec ses quitus' })
  findCampagneById(@Param('id') id: string) {
    return this.recensementService.findCampagneById(id);
  }

  @Patch('campagnes/:id/cloturer')
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Clôturer une campagne de recensement' })
  cloturerCampagne(@Param('id') id: string) {
    return this.recensementService.cloturerCampagne(id);
  }

  @Patch('campagnes/:id/archiver')
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Archiver une campagne clôturée' })
  archiverCampagne(@Param('id') id: string) {
    return this.recensementService.archiverCampagne(id);
  }

  @Get('campagnes/:id/biens-sans-quitus')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Lister les biens sans quitus pour une campagne donnée' })
  getBiensSansQuitus(@Param('id') id: string) {
    return this.recensementService.getBiensSansQuitus(id);
  }

  // ==================== QUITUS ====================

  @Post('quitus')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Créer un quitus de recensement pour un bien' })
  createQuitus(@Body() dto: CreateQuitusDto, @Request() req) {
    return this.recensementService.createQuitus(dto, req.user.id);
  }

  @Get('quitus')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Lister tous les quitus (filtrables par année et bien)' })
  @ApiQuery({ name: 'annee', required: false, type: Number })
  @ApiQuery({ name: 'bienNumero', required: false, type: String })
  findAllQuitus(
    @Query('annee') annee?: string,
    @Query('bienNumero') bienNumero?: string,
  ) {
    return this.recensementService.findAllQuitus(
      annee ? parseInt(annee) : undefined,
      bienNumero,
    );
  }

  @Get('quitus/:id')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Détail d\'un quitus' })
  findQuitusById(@Param('id') id: string) {
    return this.recensementService.findQuitusById(id);
  }

  @Patch('quitus/:id/valider')
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Valider un quitus de recensement' })
  validerQuitus(@Param('id') id: string) {
    return this.recensementService.validerQuitus(id);
  }

  @Get('verifier-quitus-n1/:bienNumero')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Vérifier si un Quitus N-1 existe pour un bien (règle Circulaire N°813)' })
  @ApiQuery({ name: 'anneeN', required: true, type: Number })
  verifierQuitusN1(
    @Param('bienNumero') bienNumero: string,
    @Query('anneeN') anneeN: string,
  ) {
    return this.recensementService.verifierQuitusN1(bienNumero, parseInt(anneeN));
  }
}
