import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IaService } from './ia.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Assistance Décision (IA)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard/ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @Get('analyse')
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({
    summary: "Rapport complet d'analyse IA (anomalies, retards, risques, suggestions)",
    description:
      'Détecte : retards travaux, travaux sans Quitus N-1, occupants sans titre, doublons avantage logement, chantiers multiples, délais occupation.',
  })
  getAnalyseComplete() {
    return this.iaService.getAnalyseComplete();
  }

  @Get('indicateurs')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Indicateurs synthétiques pour le dashboard (tous rôles)' })
  getIndicateurs() {
    return this.iaService.getIndicateursDashboard();
  }

  @Get('recommandation/:reference')
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Recommandation IA décisionnelle pour une demande spécifique' })
  getRecommandationDemande(@Param('reference') reference: string) {
    return this.iaService.evaluerDemandeDecision(reference);
  }
}