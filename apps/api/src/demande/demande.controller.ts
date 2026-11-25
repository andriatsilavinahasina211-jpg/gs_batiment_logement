import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  BadRequestException,
  Request,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { DemandeService } from './demande.service';
import { CreateDemandeDto } from './dto/create-demande.dto';
import { UpdateDemandeDto } from './dto/update-demande.dto';
import { StatutDemande } from '@prisma/client';

@ApiTags('Demandes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/demandes')
export class DemandeController {
  constructor(private readonly demandeService: DemandeService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Soumettre une nouvelle demande (Agent / Chef SRB / Admin)' })
  create(
    @Body() dto: CreateDemandeDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.demandeService.create(dto, Number(req.user.id));
  }

  @Get()
  @ApiOperation({ summary: 'Lister toutes les demandes' })
  findAll(
    @Query()
    query: {
      statut?: StatutDemande;
      demandeurId?: number;
      search?: string;
    },
  ) {
    return this.demandeService.findAll(query);
  }

  @Get(':referenceDemande')
  @ApiOperation({ summary: "Détail d'une demande" })
  findOne(@Param('referenceDemande') referenceDemande: string) {
    return this.demandeService.findOne(referenceDemande);
  }

  @Patch(':referenceDemande')
  @UseGuards(RolesGuard)
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Mettre à jour une demande (Agent / Chef SRB / Admin)' })
  update(
    @Param('referenceDemande') referenceDemande: string,
    @Body() dto: UpdateDemandeDto,
  ) {
    return this.demandeService.update(referenceDemande, dto);
  }

  @Patch(':referenceDemande/statut')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Changer le statut de validation de la demande' })
  updateStatut(
    @Param('referenceDemande') referenceDemande: string,
    @Body('statut') statut: StatutDemande,
    @Body('motif') motif?: string,
    @Body('commentaire') commentaire?: string,
    @Req() req?: any,
  ) {
    if (!Object.values(StatutDemande).includes(statut)) {
      throw new BadRequestException('Statut invalide');
    }
    const userId = req?.user?.id ? Number(req.user.id) : undefined;
    return this.demandeService.updateStatut(
      referenceDemande,
      statut,
      motif || commentaire,
      userId,
    );
  }

  @Delete(':referenceDemande')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Supprimer une demande (Admin / Chef SRB)' })
  remove(@Param('referenceDemande') referenceDemande: string) {
    return this.demandeService.remove(referenceDemande);
  }
}
