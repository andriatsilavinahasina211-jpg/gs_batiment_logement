
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';

import { AuditService } from './audit.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Audit Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({
    summary: 'Journal complet des opérations',
  })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'entite', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dateDebut', required: false })
  @ApiQuery({ name: 'dateFin', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Query() query: any) {
    return this.auditService.findAll({
      userId:
        query.userId !== undefined
          ? Number(query.userId)
          : undefined,

      entite: query.entite,
      action: query.action,
      search: query.search,
      dateDebut: query.dateDebut,
      dateFin: query.dateFin,

      page:
        query.page !== undefined
          ? Number(query.page)
          : undefined,

      limit:
        query.limit !== undefined
          ? Number(query.limit)
          : undefined,
    });
  }

  @Get(':entite/:entiteId')
  @Roles('AGENT', 'CHEF_SRB', 'ADMINISTRATEUR')
  @ApiOperation({
    summary: 'Historique des actions sur une entité',
  })
  async findByEntite(
    @Param('entite') entite: string,
    @Param('entiteId') entiteId: string,
  ) {
    return this.auditService.findByEntite(entite, entiteId);
  }
}
