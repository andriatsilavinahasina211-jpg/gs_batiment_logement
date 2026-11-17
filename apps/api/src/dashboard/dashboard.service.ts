
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // DASHBOARD SELON LE ROLE
  async getDashboardStats(userId: number, role: Role) {
    switch (role) {
      case Role.ADMINISTRATEUR:
        return this.getAdminDashboard();

      case Role.CHEF_SRB:
        return this.getValidateurDashboard(userId);

      case Role.AGENT:
        return this.getAgentDashboard(userId);

      default:
        return this.getAgentDashboard(userId);
    }
  }

  // ==========================================
  // ADMINISTRATEUR
  // ==========================================

  private async getAdminDashboard() {
    const dans45Jours = new Date();
    dans45Jours.setDate(dans45Jours.getDate() + 45);

    const [
      totalDemandes,
      demandesEnAttente,
      demandesEnCours,
      demandesValidees,
      totalUsers,
      totalBiens,
      totalBauxActifs,
      totalOccupations,
      bauxExpirantBientot,
      travauxEnCours,
      recentDemandes,
    ] = await Promise.all([
      this.prisma.demande.count(),

      this.prisma.demande.count({
        where: { statut: 'EN_ATTENTE' },
      }),

      this.prisma.demande.count({
        where: { statut: 'EN_COURS' },
      }),

      this.prisma.demande.count({
        where: { statut: 'VALIDEE' },
      }),

      this.prisma.user.count({
        where: { isActive: true },
      }),

      this.prisma.bien.count(),

      this.prisma.bail.count({
        where: { statut: 'EN_COURS' },
      }),

      this.prisma.occupation.count(),

      this.prisma.bail.count({
        where: {
          statut: 'EN_COURS',
          dateFin: {
            lte: dans45Jours,
          },
        },
      }),

      this.prisma.travaux.count({
        where: {
          statut: { in: ['EN_ATTENTE', 'EN_COURS'] },
        },
      }),

      this.prisma.demande.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          demandeur: {
            select: {
              nom: true,
              prenom: true,
              matricule: true,
            },
          },
          bien: {
            select: {
              nomDuBien: true,
              localite: true,
            },
          },
        },
      }),
    ]);

    return {
      type: 'admin',

      global: {
        totalDemandes,
        demandesEnAttente,
        demandesEnCours,
        demandesValidees,
        totalUsers,
        totalBiens,
        totalBauxActifs,
        totalOccupations,
        bauxExpirantBientot,
        travauxEnCours,
      },

      recentDemandes,
    };
  }

  // ==========================================
  // CHEF SRB / VALIDATEUR
  // ==========================================

  private async getValidateurDashboard(userId: number) {
    const dans45Jours = new Date();
    dans45Jours.setDate(dans45Jours.getDate() + 45);

    const [
      demandesEnAttente,
      demandesEnCours,
      bauxExpirantBientot,
      travauxEnCours,
      validationsRecentes,
      mesValidations,
      dossiersAValider,
    ] = await Promise.all([
      this.prisma.demande.count({
        where: { statut: 'EN_ATTENTE' },
      }),

      this.prisma.demande.count({
        where: { statut: 'EN_COURS' },
      }),

      this.prisma.bail.count({
        where: {
          statut: 'EN_COURS',
          dateFin: {
            lte: dans45Jours,
          },
        },
      }),

      this.prisma.travaux.count({
        where: {
          statut: { in: ['EN_ATTENTE', 'EN_COURS'] },
        },
      }),

      this.prisma.validation.findMany({
        where: { valideurId: userId },
        take: 10,
        orderBy: { dateValidation: 'desc' },
        include: {
          demande: {
            include: {
              demandeur: {
                select: {
                  nom: true,
                  prenom: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.validation.count({
        where: { valideurId: userId },
      }),

      // Demandes nécessitant spécifiquement la décision du Chef SRB
      this.prisma.demande.findMany({
        where: {
          statut: { in: ['EN_ATTENTE', 'EN_COURS'] },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          demandeur: {
            select: {
              nom: true,
              prenom: true,
              matricule: true,
            },
          },
          bien: {
            select: {
              nomDuBien: true,
              localite: true,
            },
          },
        },
      }),
    ]);

    return {
      type: 'validateur',
      demandesEnAttente,
      demandesEnCours,
      bauxExpirantBientot,
      travauxEnCours,
      validationsRecentes,
      mesValidations,
      dossiersAValider,
    };
  }

  // ==========================================
  // AGENT
  // ==========================================

  private async getAgentDashboard(userId: number) {
    const whereAgent = {
      OR: [
        { createdById: userId },
        { demandeurId: userId },
      ],
    };

    const [
      mesDemandes,
      demandesEnAttente,
      demandesEnCours,
      demandesValidees,
      demandesRejetees,
      recentDemandes,
      historiqueDemandes,
    ] = await Promise.all([
      this.prisma.demande.count({
        where: whereAgent,
      }),

      this.prisma.demande.count({
        where: {
          ...whereAgent,
          statut: 'EN_ATTENTE',
        },
      }),

      this.prisma.demande.count({
        where: {
          ...whereAgent,
          statut: 'EN_COURS',
        },
      }),

      this.prisma.demande.count({
        where: {
          ...whereAgent,
          statut: 'VALIDEE',
        },
      }),

      this.prisma.demande.count({
        where: {
          ...whereAgent,
          statut: 'REJETEE',
        },
      }),

      // 5 dernières demandes récentes créées ou soumises par l'agent
      this.prisma.demande.findMany({
        where: whereAgent,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          demandeur: {
            select: {
              nom: true,
              prenom: true,
              matricule: true,
            },
          },
          bien: {
            select: {
              nomDuBien: true,
              localite: true,
            },
          },
          validations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              statut: true,
              commentaire: true,
              dateValidation: true,
            },
          },
        },
      }),

      // Historique complet récent (jusqu'à 20 éléments avec chronologie)
      this.prisma.demande.findMany({
        where: whereAgent,
        take: 20,
        orderBy: { updatedAt: 'desc' },
        include: {
          demandeur: {
            select: {
              nom: true,
              prenom: true,
              matricule: true,
            },
          },
          bien: {
            select: {
              nomDuBien: true,
              localite: true,
            },
          },
          validations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              statut: true,
              commentaire: true,
              dateValidation: true,
            },
          },
        },
      }),
    ]);

    return {
      type: 'agent',
      mesDemandes,
      demandesEnAttente,
      demandesEnCours,
      demandesValidees,
      demandesRejetees,
      recentDemandes,
      historiqueDemandes,
    };
  }

  // ==========================================
  // STATISTIQUES GENERALES
  // ==========================================

  async getGeneralStats() {
    const [
      totalUsers,
      totalDemandes,
      totalBiens,
      totalBaux,
      totalOccupations,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.demande.count(),
      this.prisma.bien.count(),
      this.prisma.bail.count(),
      this.prisma.occupation.count(),
    ]);

    return {
      totalUsers,
      totalDemandes,
      totalBiens,
      totalBaux,
      totalOccupations,
    };
  }

    async getBiensParLocalite() {
    const biens = await this.prisma.bien.findMany({
      select: {
        numeroBien: true,
        nomDuBien: true,
        localite: true,
        adresse: true,
        statut: true,
      },
      orderBy: { nomDuBien: 'asc' },
    });

    return biens
      .map((bien) => ({
        numeroBien: bien.numeroBien,
        nomDuBien: bien.nomDuBien,
        statut: bien.statut,
        adresse: bien.adresse?.trim() || '',
        // Localité en priorité, sinon l'adresse
        localite: bien.localite?.trim() || bien.adresse?.trim() || '',
      }))
      .filter((bien) => bien.localite !== '');
  }
}
