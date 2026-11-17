import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AttestationService } from './attestation.service';
import { CreateAttestationDto } from './dto/create-attestation.dto';

@ApiTags('Attestations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/attestations')
export class AttestationController {
  constructor(private readonly attestationService: AttestationService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('AGENT', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Créer une attestation (Agent / Admin)' })
  create(@Body() dto: CreateAttestationDto, @Req() req: any) {
    return this.attestationService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les attestations' })
  findAll() {
    return this.attestationService.findAll();
  }

  /** PDF avant :id pour éviter conflit de route */
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Télécharger le PDF (après validation chef)' })
  async generatePdf(@Param('id') id: string, @Res() res: any) {
    const buffer = await this.attestationService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="attestation-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    return res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une attestation' })
  findOne(@Param('id') id: string) {
    return this.attestationService.findOne(id);
  }

  @Post(':id/valider')
  @UseGuards(RolesGuard)
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({ summary: 'Valider l\'attestation (Chef SRB)' })
  valider(@Param('id') id: string) {
    return this.attestationService.valider(id);
  }
}