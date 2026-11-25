import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  Res,
  Header,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OccupationService } from './occupation.service';
import { CreateOccupationDto } from './dto/create-occupation.dto';
import { DemandeLiberationDto, ValiderLiberationDto } from './dto/liberation.dto';
import { EtatDesLieuxDto } from './dto/etat-des-lieux.dto';
import { OccupationStatus } from '@prisma/client';
import type { Response } from 'express';
import { log } from 'console';

@ApiTags('Occupation & LibÃ©ration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/occupations')
export class OccupationController {
  constructor(private readonly occupationService: OccupationService) {}

  // ====================== CRUD DE BASE ======================

  @Post()
  @UseGuards(RolesGuard)
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'CrÃ©er une nouvelle occupation (Agent / Chef SRB / Admin)' })
  @ApiResponse({ status: 201, description: 'Occupation crÃ©Ã©e avec succÃ¨s' })
  async create(
    @Body() createOccupationDto: CreateOccupationDto,
    @Req() req: any,
  ) {
    return this.occupationService.create(createOccupationDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister toutes les occupations' })
  @ApiQuery({ name: 'statut', required: false, enum: OccupationStatus })
  @ApiQuery({ name: 'bienNumero', required: false })
  @ApiQuery({ name: 'demandeurId', required: false })
  async findAll(@Query() query: any) {
    return this.occupationService.findAll(query);
  }

  @Get('alertes/fin-proche')
  @ApiOperation({ summary: 'Occupations en fin de jouissance / sans titre' })
  async getFinProche() {
    return this.occupationService.getOccupationsFinProche();
  }

  @Post('alertes/run')
  @UseGuards(RolesGuard)
  @Roles('ADMINISTRATEUR', 'CHEF_SRB')
  @ApiOperation({ summary: 'ExÃ©cuter manuellement le contrÃ´le fin de jouissance' })
  async runAlertes() {
    return this.occupationService.handleEndOfOccupancyAlerts();
  }

  @Patch(':numeroOccupation/valider')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({
    summary: 'Valider une occupation â†’ APPROUVE + Demande VALIDEE',
  })
  async validerOccupation(
    @Param('numeroOccupation') numeroOccupation: string,
    @Req() req: any,
  ) {
    return this.occupationService.validerOccupation(numeroOccupation, req.user);
  }


  //recuperer une occupation par le numero
  @Get(':numeroOccupation')
  @ApiOperation({ summary: 'RÃ©cupÃ©rer une occupation par son numÃ©ro' })
  async findOne(@Param('numeroOccupation') numeroOccupation: string) {
    return this.occupationService.findOne(numeroOccupation);
  }

  @Patch(':numeroOccupation')
  @UseGuards(RolesGuard)
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Mettre Ã  jour une occupation (Agent / Chef SRB / Admin)' })
  async update(
    @Param('numeroOccupation') numeroOccupation: string,
    @Body() updateDto: any,
  ) {
    return this.occupationService.update(numeroOccupation, updateDto);
  }

  @Delete(':numeroOccupation')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Supprimer une occupation' })
  async remove(@Param('numeroOccupation') numeroOccupation: string) {
    return this.occupationService.remove(numeroOccupation);
  }

  // ====================== LIBÃ‰RATION ======================

  @Post(':numeroOccupation/liberation/demander')
  @UseGuards(RolesGuard)
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Demander la libÃ©ration dâ€™une occupation (Agent / Admin)' })
  async demanderLiberation(
    @Param('numeroOccupation') numeroOccupation: string,
    @Body() dto: DemandeLiberationDto,
    @Req() req: any,
  ) {
    return this.occupationService.demanderLiberation(numeroOccupation, dto, req.user);
  }

  @Post(':numeroOccupation/liberation/valider')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Valider la libÃ©ration (Chef SRB / Admin)' })
  async validerLiberation(
    @Param('numeroOccupation') numeroOccupation: string,
    @Body() dto: ValiderLiberationDto,
    @Req() req: any,
  ) {
    return this.occupationService.validerLiberation(numeroOccupation, dto, req.user);
  }

  // ====================== Ã‰TATS DES LIEUX ======================

  @Patch(':numeroOccupation/etat-entree')
  @ApiOperation({ summary: 'Enregistrer lâ€™Ã©tat des lieux dâ€™entrÃ©e' })
  async updateEtatEntree(
    @Param('numeroOccupation') numeroOccupation: string,
    @Body() formulaire: any,
    @Req() req: any,
  ) {
    return this.occupationService.updateEtatDesLieux(
      numeroOccupation,
      'ENTREE',
      formulaire,
      req.user,
    );
  }

  @Patch(':numeroOccupation/etat-sortie')
  @ApiOperation({ summary: 'Enregistrer lâ€™Ã©tat des lieux de sortie' })
  async updateEtatSortie(
    @Param('numeroOccupation') numeroOccupation: string,
    @Body() formulaire: any,
    @Req() req: any,
  ) {
    return this.occupationService.updateEtatDesLieux(
      numeroOccupation,
      'SORTIE',
      formulaire,
      req.user,
    );
  }

  // ====================== GÃ‰NÃ‰RATION PDF ======================

  @Post(':numeroOccupation/etat-des-lieux/pdf')
  @ApiOperation({ summary: 'GÃ©nÃ©rer le PDF de l\'Ã©tat des lieux' })
  @ApiConsumes('application/json')
  @ApiResponse({ status: 200, description: 'PDF gÃ©nÃ©rÃ© avec succÃ¨s' })
  async generateEtatDesLieuxPdf(
    @Param('numeroOccupation') numeroOccupation: string,
    @Body() formulaire: EtatDesLieuxDto,
  ): Promise<StreamableFile> {
    const buffer = await this.occupationService.generateEtatDesLieuxPdf(
      numeroOccupation,
      formulaire,
    );

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="etat-des-lieux-${numeroOccupation}.pdf"`,
    });
  }

  // ====================== ALERTES & STATUT ======================

  // @Get('alertes/fin-proche')
  // @ApiOperation({ summary: 'RÃ©cupÃ©rer les occupations proches de la fin de jouissance' })
  // async getFinProche() {
  //   return this.occupationService.getOccupationsFinProche();
  // }


  //*************************    ****************** */
  @Patch(':numeroOccupation/statut')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Changer manuellement le statut (Admin/Chef SRB)' })
  async updateStatut(
    @Param('numeroOccupation') numeroOccupation: string,
    @Body('statut') statut: OccupationStatus,
  ) {
    if (!Object.values(OccupationStatus).includes(statut)) {
      throw new BadRequestException('Statut invalide');
    }
    return this.occupationService.updateStatut(numeroOccupation, statut);
  }
}
