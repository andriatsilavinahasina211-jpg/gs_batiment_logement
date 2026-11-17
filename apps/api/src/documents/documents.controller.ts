import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Documents PDF')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('attestation/:id/pdf')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Générer le PDF d\'une attestation de non-logement' })
  async attestationPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.documentsService.generateAttestationPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="attestation-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('quitus/:id/pdf')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Générer le PDF d\'un quitus de recensement' })
  async quitusPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.documentsService.generateQuitusPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quitus-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('etat-des-lieux/:occupationId/pdf')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Générer le PDF d\'un état des lieux (ENTREE ou SORTIE)' })
  @ApiQuery({ name: 'type', enum: ['ENTREE', 'SORTIE'], required: true })
  async etatDesLieuxPdf(
    @Param('occupationId') occupationId: string,
    @Query('type') type: 'ENTREE' | 'SORTIE',
    @Res() res: Response,
  ) {
    const buffer = await this.documentsService.generateEtatDesLieuxPdf(occupationId, type);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="etat-lieux-${occupationId}-${type}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('bail/:numeroBail/pdf')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Générer le PDF du contrat de bail (modèle officiel MEF/DPE)' })
  async contratBailPdf(@Param('numeroBail') numeroBail: string, @Res() res: Response) {
    const buffer = await this.documentsService.generateContratBailPdf(numeroBail);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contrat-bail-${numeroBail}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
