import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTravauxDto } from './dto/create-travaux.dto';
import { UpdateAvancementDto } from './dto/update-avancement.dto';
import { UpdateTravauxDto } from './dto/update-travaux.dto';
import { RecensementService } from 'src/recensement/recensement.service';
import { StatutTravaux, StatutBien } from '@prisma/client';

@Injectable()
export class TravauxService {
  constructor(
    private prisma: PrismaService,
    private recensementService: RecensementService,
  ) {}

  async create(dto: CreateTravauxDto, userId: number) {
    // 1. Vérifier que le bien existe
    const bien = await this.prisma.bien.findUnique({ where: { numeroBien: dto.bienNumero } });
    if (!bien) throw new NotFoundException(`Bien ${dto.bienNumero} non trouvé`);

    // 2. Vérification Quitus N-1 (Circulaire N°813-MFB/SG/DGB/DPE/SLA du 20 décembre 2010)
    const anneeN = new Date().getFullYear();
    const quitusN1Present = await this.recensementService.verifierQuitusN1(
      dto.bienNumero,
      anneeN,
    );

    if (!quitusN1Present) {
      // On crée quand même le chantier mais on marque l'absence du quitus N-1
      // et on génèrera une alerte
      console.warn(
        `[ALERTE CONFORMITÉ] Travaux créés pour bien ${dto.bienNumero} sans Quitus N-1 (${anneeN - 1}). Non conforme Circulaire N°813.`,
      );
    }

    // 3. Vérifier chevauchement : travaux déjà en cours sur ce bien
    const travauxEnCours = await this.prisma.travaux.findFirst({
      where: {
        bienNumero: dto.bienNumero,
        statut: { in: [StatutTravaux.EN_COURS, StatutTravaux.EN_ATTENTE] },
      },
    });
    if (travauxEnCours) {
      throw new BadRequestException(
        `[ANOMALIE IA] Des travaux sont déjà en cours ou en attente sur ce bien (réf: ${travauxEnCours.reference}). Veuillez clôturer ou suspendre les travaux existants avant d'en créer de nouveaux.`,
      );
    }

    // 4. Validation des dates
    if (new Date(dto.dateDebutPrevue) >= new Date(dto.dateFinPrevue)) {
      throw new BadRequestException('La date de fin prévue doit être postérieure à la date de début.');
    }

    const reference = `TRAV-${anneeN}-${Date.now().toString().slice(-5)}`;

    const travaux = await this.prisma.travaux.create({
      data: {
        reference,
        bienNumero: dto.bienNumero,
        typeTravaux: dto.typeTravaux,
        dateDebutPrevue: new Date(dto.dateDebutPrevue),
        dateFinPrevue: new Date(dto.dateFinPrevue),
        montantEstimatif: dto.montantEstimatif,
        referenceDevis: dto.referenceDevis,
        observations: dto.observations,
        autorisationDpe: dto.autorisationDpe ?? false,
        quitusN1Present,
        statut: StatutTravaux.EN_ATTENTE,
        createdById: userId,
      },
      include: {
        bien: true,
        createdBy: { select: { nom: true, prenom: true, matricule: true } },
      },
    });

    // 5. Mettre à jour le statut du bien
    await this.prisma.bien.update({
      where: { numeroBien: dto.bienNumero },
      data: { statut: StatutBien.EN_TRAVAUX },
    });

    // 6. Historique initial
    await this.prisma.historiqueTravaux.create({
      data: {
        travauxId: travaux.id,
        action: 'CREATION',
        nouvelleValeur: JSON.stringify({ reference, statut: 'EN_ATTENTE', quitusN1Present }),
        commentaire: `Chantier créé. Quitus N-1 ${quitusN1Present ? 'présent ✓' : 'ABSENT ⚠️ (non conforme Circulaire N°813)'}`,
        userId,
      },
    });

    return { ...travaux, alerteQuitusAbsent: !quitusN1Present };
  }

  async findAll(filters: {
    statut?: StatutTravaux;
    bienNumero?: string;
    retardSeulement?: boolean;
  }) {
    const now = new Date();
    const travaux = await this.prisma.travaux.findMany({
      where: {
        ...(filters.statut ? { statut: filters.statut } : {}),
        ...(filters.bienNumero ? { bienNumero: filters.bienNumero } : {}),
        ...(filters.retardSeulement
          ? {
              dateFinPrevue: { lt: now },
              statut: { notIn: [StatutTravaux.TERMINE, StatutTravaux.ANNULE] },
            }
          : {}),
      },
      include: {
        bien: { select: { nomDuBien: true, adresse: true, typeBien: true } },
        createdBy: { select: { nom: true, prenom: true } },
        _count: { select: { historique: true, piecesJointes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrichir avec info retard
    return travaux.map((t) => ({
      ...t,
      enRetard:
        !['TERMINE', 'ANNULE'].includes(t.statut) &&
        t.dateFinPrevue < now,
    }));
  }

  async findOne(id: string) {
    const travaux = await this.prisma.travaux.findUnique({
      where: { id },
      include: {
        bien: true,
        createdBy: { select: { nom: true, prenom: true, matricule: true } },
        historique: {
          include: { user: { select: { nom: true, prenom: true } } },
          orderBy: { createdAt: 'desc' },
        },
        piecesJointes: true,
      },
    });
    if (!travaux) throw new NotFoundException('Travaux non trouvés');

    const enRetard =
      !['TERMINE', 'ANNULE'].includes(travaux.statut) &&
      travaux.dateFinPrevue < new Date();

    return { ...travaux, enRetard };
  }

  async updateAvancement(id: string, dto: UpdateAvancementDto, userId: number) {
    const travaux = await this.findOne(id);
    const ancien = { ...travaux };

    const updated = await this.prisma.travaux.update({
      where: { id },
      data: {
        ...(dto.avancementPourcent !== undefined ? { avancementPourcent: dto.avancementPourcent } : {}),
        ...(dto.statut ? { statut: dto.statut } : {}),
        ...(dto.dateDebutReelle ? { dateDebutReelle: new Date(dto.dateDebutReelle) } : {}),
        ...(dto.dateFinReelle ? { dateFinReelle: new Date(dto.dateFinReelle) } : {}),
        ...(dto.montantReel !== undefined ? { montantReel: dto.montantReel } : {}),
        ...(dto.observations ? { observations: dto.observations } : {}),
      },
      include: {
        bien: true,
        createdBy: { select: { nom: true, prenom: true } },
      },
    });

    // Historique de modification
    await this.prisma.historiqueTravaux.create({
      data: {
        travauxId: id,
        action: dto.statut ? 'STATUT' : 'AVANCEMENT',
        ancienValeur: JSON.stringify({
          avancement: ancien.avancementPourcent,
          statut: ancien.statut,
        }),
        nouvelleValeur: JSON.stringify({
          avancement: dto.avancementPourcent ?? ancien.avancementPourcent,
          statut: dto.statut ?? ancien.statut,
        }),
        commentaire: dto.commentaire,
        userId,
      },
    });

    // Si terminé, libérer le statut EN_TRAVAUX du bien
    if (dto.statut === StatutTravaux.TERMINE) {
      // Remettre le statut précédent du bien (on le met LIBRE par défaut ou vérifier les occupations)
      const occupationActive = await this.prisma.occupation.findFirst({
        where: { bienNumero: travaux.bienNumero, statut: { in: ['EN_COURS', 'APPROUVE'] } },
      });
      await this.prisma.bien.update({
        where: { numeroBien: travaux.bienNumero },
        data: { statut: occupationActive ? StatutBien.OCCUPE : StatutBien.LIBRE },
      });
    }

    return updated;
  }

  async getHistorique(id: string) {
    await this.findOne(id);
    return this.prisma.historiqueTravaux.findMany({
      where: { travauxId: id },
      include: { user: { select: { nom: true, prenom: true, matricule: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retourne tous les travaux en retard (pour alertes et IA)
   */
  async getTravauxEnRetard() {
    const now = new Date();
    return this.prisma.travaux.findMany({
      where: {
        dateFinPrevue: { lt: now },
        statut: { notIn: [StatutTravaux.TERMINE, StatutTravaux.ANNULE] },
      },
      include: {
        bien: { select: { nomDuBien: true, adresse: true } },
        createdBy: { select: { nom: true, prenom: true } },
      },
    });
  }

  /**
   * Retourne les travaux sans Quitus N-1 (anomalies de conformité)
   */
  async getTravauxSansQuitusN1() {
    return this.prisma.travaux.findMany({
      where: { quitusN1Present: false, statut: { not: StatutTravaux.ANNULE } },
      include: {
        bien: { select: { nomDuBien: true, adresse: true } },
      },
    });
  }

  async update(id: string, dto: UpdateTravauxDto, userId: number) {
    const travaux = await this.findOne(id);
    const ancien = { ...travaux };

    const updateData: any = {};
    if (dto.typeTravaux !== undefined) updateData.typeTravaux = dto.typeTravaux;
    if (dto.bienNumero !== undefined) {
      const bien = await this.prisma.bien.findUnique({ where: { numeroBien: dto.bienNumero } });
      if (!bien) throw new NotFoundException(`Bien ${dto.bienNumero} non trouvé`);
      updateData.bienNumero = dto.bienNumero;
    }
    if (dto.dateDebutPrevue) updateData.dateDebutPrevue = new Date(dto.dateDebutPrevue);
    if (dto.dateFinPrevue) updateData.dateFinPrevue = new Date(dto.dateFinPrevue);
    if (dto.dateDebutReelle !== undefined) {
      updateData.dateDebutReelle = dto.dateDebutReelle ? new Date(dto.dateDebutReelle) : null;
    }
    if (dto.dateFinReelle !== undefined) {
      updateData.dateFinReelle = dto.dateFinReelle ? new Date(dto.dateFinReelle) : null;
    }
    if (dto.montantEstimatif !== undefined) updateData.montantEstimatif = dto.montantEstimatif;
    if (dto.montantReel !== undefined) updateData.montantReel = dto.montantReel;
    if (dto.statut !== undefined) updateData.statut = dto.statut;
    if (dto.avancementPourcent !== undefined) updateData.avancementPourcent = dto.avancementPourcent;
    if (dto.referenceDevis !== undefined) updateData.referenceDevis = dto.referenceDevis;
    if (dto.observations !== undefined) updateData.observations = dto.observations;
    if (dto.autorisationDpe !== undefined) updateData.autorisationDpe = dto.autorisationDpe;

    const updated = await this.prisma.travaux.update({
      where: { id },
      data: updateData,
      include: {
        bien: { select: { nomDuBien: true, adresse: true, typeBien: true } },
        createdBy: { select: { nom: true, prenom: true } },
      },
    });

    // Enregistrer dans l'historique
    await this.prisma.historiqueTravaux.create({
      data: {
        travauxId: id,
        action: dto.statut && dto.statut !== ancien.statut ? 'STATUT' : 'MODIFICATION',
        ancienValeur: JSON.stringify({
          avancement: ancien.avancementPourcent,
          statut: ancien.statut,
        }),
        nouvelleValeur: JSON.stringify({
          avancement: dto.avancementPourcent ?? ancien.avancementPourcent,
          statut: dto.statut ?? ancien.statut,
        }),
        commentaire: dto.commentaire || 'Mise à jour des informations du chantier',
        userId,
      },
    });

    // Gestion du statut du bien
    if (dto.statut === StatutTravaux.TERMINE || dto.statut === StatutTravaux.ANNULE) {
      const autresTravaux = await this.prisma.travaux.findFirst({
        where: {
          bienNumero: updated.bienNumero,
          id: { not: id },
          statut: { in: [StatutTravaux.EN_COURS, StatutTravaux.EN_ATTENTE] },
        },
      });
      if (!autresTravaux) {
        const occupationActive = await this.prisma.occupation.findFirst({
          where: { bienNumero: updated.bienNumero, statut: { in: ['EN_COURS', 'APPROUVE'] } },
        });
        await this.prisma.bien.update({
          where: { numeroBien: updated.bienNumero },
          data: { statut: occupationActive ? StatutBien.OCCUPE : StatutBien.LIBRE },
        });
      }
    }

    return updated;
  }

  async remove(id: string) {
    const travaux = await this.findOne(id);
    await this.prisma.historiqueTravaux.deleteMany({ where: { travauxId: id } });
    await this.prisma.pieceJointe.deleteMany({ where: { travauxId: id } });
    await this.prisma.travaux.delete({ where: { id } });

    // Rétablir le statut du bien si plus de chantier en cours
    const autresTravaux = await this.prisma.travaux.findFirst({
      where: {
        bienNumero: travaux.bienNumero,
        statut: { in: [StatutTravaux.EN_COURS, StatutTravaux.EN_ATTENTE] },
      },
    });
    if (!autresTravaux) {
      const occupationActive = await this.prisma.occupation.findFirst({
        where: { bienNumero: travaux.bienNumero, statut: { in: ['EN_COURS', 'APPROUVE'] } },
      });
      await this.prisma.bien.update({
        where: { numeroBien: travaux.bienNumero },
        data: { statut: occupationActive ? StatutBien.OCCUPE : StatutBien.LIBRE },
      });
    }

    return { success: true };
  }
}

