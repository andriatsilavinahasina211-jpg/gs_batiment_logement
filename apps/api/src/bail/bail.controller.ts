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
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { BailService } from './bail.service';
import { CreateBailDto } from './dto/create-bail.dto';
import { UpdateBailDto } from './dto/update-bail.dto';
import { UpdateChecklistDto } from './dto/checklist.dto';
import { RenouvellementDto } from './dto/renouvellement.dto';
import { CreateAvenantDto } from './dto/create-avenant.dto';
import { AccordMefDto, VisaCfDto, EnregistrementFiscalDto } from './dto/circuit.dto';

@ApiTags('Baux à Loyer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/baux')
export class BailController {
  constructor(private readonly bailService: BailService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Créer un nouveau bail (Agent / Chef SRB / Admin)' })
  create(@Body() dto: CreateBailDto, @Req() req: any) {
    return this.bailService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les baux' })
  findAll(@Query() query: any) {
    return this.bailService.findAll(query);
  }

  @Get(':numeroBail')
  @ApiOperation({ summary: 'Détail d\'un bail' })
  findOne(@Param('numeroBail') numeroBail: string) {
    return this.bailService.findOne(numeroBail);
  }

  @Patch(':numeroBail')
  @UseGuards(RolesGuard)
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Mettre à jour un bail (Agent / Chef SRB / Admin)' })
  update(
    @Param('numeroBail') numeroBail: string,
    @Body() dto: UpdateBailDto,
  ) {
    return this.bailService.update(numeroBail, dto);
  }

  @Delete(':numeroBail')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Supprimer un bail' })
  remove(@Param('numeroBail') numeroBail: string) {
    return this.bailService.remove(numeroBail);
  }

  // ====================== CHECKLIST ======================
  @Get(':numeroBail/checklist')
  @ApiOperation({ summary: 'Récupérer la checklist des pièces' })
  getChecklist(@Param('numeroBail') numeroBail: string) {
    return this.bailService.getChecklist(numeroBail);
  }

  @Patch(':numeroBail/checklist')
  @ApiOperation({ summary: 'Mettre à jour la checklist' })
  updateChecklist(
    @Param('numeroBail') numeroBail: string,
    @Body() dto: UpdateChecklistDto,
  ) {
    return this.bailService.updateChecklist(numeroBail, dto);
  }

  // ====================== CIRCUIT REGLEMENTAIRE (SECTION 6.5.3.1) ======================
  @Post(':numeroBail/accord-mef')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Enregistrer l\'Accord Préalable du MEF' })
  validerAccordMEF(
    @Param('numeroBail') numeroBail: string,
    @Body() dto: AccordMefDto,
  ) {
    return this.bailService.validerAccordMEF(numeroBail, dto);
  }

  @Post(':numeroBail/visa-cf')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Enregistrer le Visa du Contrôle Financier (CF)' })
  validerVisaCF(
    @Param('numeroBail') numeroBail: string,
    @Body() dto: VisaCfDto,
  ) {
    return this.bailService.validerVisaCF(numeroBail, dto);
  }

  @Post(':numeroBail/approuver-srb')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Approbation SRB / DPE' })
  approuverSRB(@Param('numeroBail') numeroBail: string, @Req() req: any) {
    return this.bailService.approuverSRB(numeroBail, req.user);
  }

  @Post(':numeroBail/enregistre-fiscal')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Enregistrer la référence d\'Enregistrement Fiscal et Timbre' })
  validerEnregistrementFiscal(
    @Param('numeroBail') numeroBail: string,
    @Body() dto: EnregistrementFiscalDto,
  ) {
    return this.bailService.validerEnregistrementFiscal(numeroBail, dto);
  }

  @Post(':numeroBail/terminer')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Terminer un bail' })
  terminer(@Param('numeroBail') numeroBail: string, @Req() req: any) {
    return this.bailService.terminerBail(numeroBail, req.user);
  }

  // ====================== contrat de bail =====================
  @Get(':numeroBail/contrat/pdf')
  @ApiOperation({ summary: 'Générer le PDF du contrat de bail' })
  async generateContratPdf(
    @Param('numeroBail') numeroBail: string,
    @Res() res: any,
  ) {
    const buffer = await this.bailService.generateContratPdf(numeroBail);

    res.header('Content-Type', 'application/pdf');
    res.header(
      'Content-Disposition',
      `attachment; filename=contrat-bail-${numeroBail}.pdf`,
    );
    return res.send(buffer);
  }

  // ====================== RENOUVELLEMENT ======================
  @Post(':numeroBail/renouveler')
  @UseGuards(RolesGuard)
  @Roles('AGENT', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Renouveler un bail (Agent / Admin)' })
  renouveler(
    @Param('numeroBail') numeroBail: string,
    @Body() dto: RenouvellementDto,
    @Req() req: any,
  ) {
    return this.bailService.renouveler(numeroBail, dto, req.user);
  }

  // ====================== AVENANTS ======================

  @Post(':numeroBail/avenants')
  @ApiOperation({ summary: 'Créer un avenant sur un bail' })
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  createAvenant(
    @Param('numeroBail') numeroBail: string,
    @Body() dto: CreateAvenantDto,
    @Req() req: any,
  ) {
    return this.bailService.createAvenant(numeroBail, dto, req.user);
  }

  @Get(':numeroBail/avenants')
  @ApiOperation({ summary: 'Lister les avenants d\'un bail' })
  getAvenants(@Param('numeroBail') numeroBail: string) {
    return this.bailService.getAvenants(numeroBail);
  }

  @Get(':numeroBail/avenants/:avenantId')
  @ApiOperation({ summary: 'Détail d\'un avenant' })
  getAvenant(
    @Param('numeroBail') numeroBail: string,
    @Param('avenantId') avenantId: string,
  ) {
    return this.bailService.getAvenant(numeroBail, avenantId);
  }

  @Get(':numeroBail/avenants/:avenantId/pdf')
  @ApiOperation({ summary: 'Générer le PDF de l\'avenant' })
  async generateAvenantPdf(
    @Param('numeroBail') numeroBail: string,
    @Param('avenantId') avenantId: string,
    @Res() res: any,
  ) {
    const buffer = await this.bailService.generateAvenantPdf(numeroBail, avenantId);

    res.header('Content-Type', 'application/pdf');
    res.header(
      'Content-Disposition',
      `attachment; filename=avenant-${avenantId}.pdf`,
    );
    return res.send(buffer);
  }

  @Delete(':numeroBail/avenants/:avenantId')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Supprimer un avenant' })
  deleteAvenant(
    @Param('numeroBail') numeroBail: string,
    @Param('avenantId') avenantId: string,
  ) {
    return this.bailService.deleteAvenant(numeroBail, avenantId);
  }
}