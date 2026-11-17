
import {
  Controller,
  Get,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';
import { Role } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { DashboardService } from './dashboard.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    role: Role;
  };
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  // DASHBOARD PERSONNALISE
  @Get('stats')
  async getDashboardStats(
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new UnauthorizedException(
        'Utilisateur non authentifié',
      );
    }

    return this.dashboardService.getDashboardStats(
      Number(req.user.id),
      req.user.role,
    );
  }

  // INFORMATIONS DE BASE
  @Get('public')
  getBasicInfo() {
    return {
      message: 'Informations de base',
    };
  }

    // CARTE DES BIENS PAR LOCALITE
  @Get('map-biens')
  @Roles(Role.ADMINISTRATEUR, Role.CHEF_SRB, Role.AGENT)
  async getBiensMap() {
    return this.dashboardService.getBiensParLocalite();
  }

  // Statistiques agrégées affichées sur le tableau de bord de chaque rôle.
  @Get('general-stats')
  @Roles(Role.ADMINISTRATEUR, Role.CHEF_SRB, Role.AGENT)
  async getGeneralStats() {
    return this.dashboardService.getGeneralStats();
  }
}
