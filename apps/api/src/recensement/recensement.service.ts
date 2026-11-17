import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCampagneDto } from './dto/create-campagne.dto';
import { CreateQuitusDto } from './dto/create-quitus.dto';
import { Prisma, StatutCampagne, StatutQuitus } from '@prisma/client';
import { CreateDemandeRecensementDto } from 'src/demande/dto/create-demande-recensement.dto';

@Injectable()
export class RecensementService {
  constructor(private prisma: PrismaService) {}

  // ==================== CAMPAGNES ====================

  async createCampagne(dto: CreateCampagneDto) {
    // Vérifier qu'une campagne n'existe pas déjà pour cette année
    const existing = await this.prisma.campagneRecensement.findFirst({
      where: { annee: dto.annee },
    });
    if (existing) {
      throw new ConflictException(
        `Une campagne de recensement existe déjà pour l'année ${dto.annee}`,
      );
    }

    // Vérifier que la date de clôture respecte la limite réglementaire (30 juin)
    if (dto.dateCloture) {
      const cloture = new Date(dto.dateCloture);
      const limiteReglementaire = new Date(`${dto.annee}-06-30`);
      if (cloture > limiteReglementaire) {
        throw new BadRequestException(
          `La date de clôture ne peut pas dépasser le 30 juin ${dto.annee} (limite réglementaire).`,
        );
      }
    }

    return this.prisma.campagneRecensement.create({
      data: {
        annee: dto.annee,
        dateOuverture: new Date(dto.dateOuverture),
        dateCloture: dto.dateCloture ? new Date(dto.dateCloture) : null,
        description: dto.description,
        statut: StatutCampagne.OUVERTE,
      },
    });
  }

  async findAllCampagnes() {
    return this.prisma.campagneRecensement.findMany({
      orderBy: { annee: 'desc' },
      include: {
        _count: { select: { quitus: true } },
      },
    });
  }

  async findCampagneById(id: string) {
    const campagne = await this.prisma.campagneRecensement.findUnique({
      where: { id },
      include: {
        quitus: {
          include: {
            bien: true,
            occupant: true,
          },
        },
      },
    });
    if (!campagne) throw new NotFoundException('Campagne de recensement non trouvée');
    return campagne;
  }

  async cloturerCampagne(id: string) {
    const campagne = await this.prisma.campagneRecensement.findUnique({ where: { id } });
    if (!campagne) throw new NotFoundException('Campagne non trouvée');
    if (campagne.statut === StatutCampagne.CLOTUREE) {
      throw new BadRequestException('Cette campagne est déjà clôturée.');
    }
    return this.prisma.campagneRecensement.update({
      where: { id },
      data: {
        statut: StatutCampagne.CLOTUREE,
        dateCloture: campagne.dateCloture ?? new Date(),
      },
    });
  }

  async archiverCampagne(id: string) {
    return this.prisma.campagneRecensement.update({
      where: { id },
      data: { statut: StatutCampagne.ARCHIVEE },
    });
  }

  // ==================== QUITUS ====================

  async createQuitus(dto: CreateQuitusDto, userId: number) {
    // Vérifier que la campagne existe et est ouverte
    const campagne = await this.prisma.campagneRecensement.findUnique({
      where: { id: dto.campagneId },
    });
    if (!campagne) throw new NotFoundException('Campagne de recensement non trouvée');
    if (campagne.statut !== StatutCampagne.OUVERTE) {
      throw new BadRequestException(
        'Impossible de créer un quitus : la campagne est clôturée ou archivée.',
      );
    }

    return this.createQuitusRecord(this.prisma, dto, userId, campagne);
  }

  async createQuitusDepuisDemande(
    tx: Prisma.TransactionClient,
    dto: CreateDemandeRecensementDto & {
      bienNumero: string;
      occupantId: number;
    },
    userId: number,
  ) {
    const campagne = await tx.campagneRecensement.findUnique({
      where: { annee: dto.annee },
    });
    if (!campagne) {
      throw new NotFoundException(
        `Aucune campagne de recensement n'existe pour l'année ${dto.annee}`,
      );
    }
    if (campagne.statut !== StatutCampagne.OUVERTE) {
      throw new BadRequestException(
        `La campagne de recensement ${dto.annee} n'est pas ouverte.`,
      );
    }

    return this.createQuitusRecord(
      tx,
      {
        bienNumero: dto.bienNumero,
        campagneId: campagne.id,
        occupantId: dto.occupantId,
        etatBatiment: dto.etatBatiment,
        observations: dto.observations,
      },
      userId,
      campagne,
    );
  }

  private async createQuitusRecord(
    client: PrismaService | Prisma.TransactionClient,
    dto: CreateQuitusDto,
    userId: number,
    campagne: { id: string; annee: number },
  ) {
    const bien = await client.bien.findUnique({
      where: { numeroBien: dto.bienNumero },
    });
    if (!bien) throw new NotFoundException(`Bien ${dto.bienNumero} non trouvé`);

    const existing = await client.quitus.findFirst({
      where: { bienNumero: dto.bienNumero, annee: campagne.annee },
    });
    if (existing) {
      throw new ConflictException(
        `Un quitus existe déjà pour le bien ${dto.bienNumero} pour l'année ${campagne.annee}`,
      );
    }

    const occupation = await client.occupation.findFirst({
      where: {
        bienNumero: dto.bienNumero,
        statut: { in: ['EN_COURS', 'APPROUVE'] },
      },
      include: { occupant: true },
    });

    const donneesSnapshot = {
      bien: {
        numeroBien: bien.numeroBien,
        nomDuBien: bien.nomDuBien,
        typeBien: bien.typeBien,
        adresse: bien.adresse,
        statut: bien.statut,
        etatBatisse: bien.etatBatisse,
      },
      occupation: occupation
        ? {
            numeroOccupation: occupation.numeroOccupation,
            dateEntree: occupation.dateEntree,
            occupant: occupation.occupant
              ? {
                  nom: occupation.occupant.nom,
                  prenom: occupation.occupant.prenom,
                  matricule: occupation.occupant.matricule,
                }
              : null,
          }
        : null,
      dateSnapshot: new Date().toISOString(),
    };

    const reference = `QUITUS-${campagne.annee}-${Date.now().toString().slice(-5)}`;

    return client.quitus.create({
      data: {
        reference,
        annee: campagne.annee,
        bienNumero: dto.bienNumero,
        campagneId: dto.campagneId,
        occupantId: dto.occupantId ?? occupation?.occupantId ?? null,
        etatBatiment: dto.etatBatiment,
        observations: dto.observations,
        statut: StatutQuitus.BROUILLON,
        donneesSnapshot,
        createdById: userId,
      },
      include: {
        bien: true,
        occupant: true,
        campagne: true,
        createdBy: { select: { nom: true, prenom: true, matricule: true } },
      },
    });
  }

  async findAllQuitus(annee?: number, bienNumero?: string) {
    return this.prisma.quitus.findMany({
      where: {
        ...(annee ? { annee } : {}),
        ...(bienNumero ? { bienNumero } : {}),
      },
      include: {
        bien: true,
        occupant: true,
        campagne: { select: { annee: true, statut: true } },
        createdBy: { select: { nom: true, prenom: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findQuitusById(id: string) {
    const quitus = await this.prisma.quitus.findUnique({
      where: { id },
      include: {
        bien: true,
        occupant: true,
        campagne: true,
        createdBy: { select: { nom: true, prenom: true, matricule: true } },
      },
    });
    if (!quitus) throw new NotFoundException('Quitus non trouvé');
    return quitus;
  }

  async validerQuitus(id: string) {
    await this.findQuitusById(id);
    return this.prisma.quitus.update({
      where: { id },
      data: { statut: StatutQuitus.VALIDE },
    });
  }

  /**
   * Vérifie si un Quitus de l'année N-1 existe pour un bien donné.
   * Utilisé par le module Travaux (Circulaire N°813).
   */
  async verifierQuitusN1(bienNumero: string, anneeN: number): Promise<boolean> {
    const anneeN1 = anneeN - 1;
    const quitus = await this.prisma.quitus.findFirst({
      where: {
        bienNumero,
        annee: anneeN1,
        statut: { in: [StatutQuitus.VALIDE, StatutQuitus.GENERE] },
      },
    });
    return !!quitus;
  }

  /**
   * Retourne la liste des biens sans quitus pour une campagne donnée.
   */
  async getBiensSansQuitus(campagneId: string) {
    const campagne = await this.prisma.campagneRecensement.findUnique({
      where: { id: campagneId },
      include: { quitus: { select: { bienNumero: true } } },
    });
    if (!campagne) throw new NotFoundException('Campagne non trouvée');

    const biensAvecQuitus = new Set(campagne.quitus.map((q) => q.bienNumero));
    const tousLesBiens = await this.prisma.bien.findMany({ select: { numeroBien: true, nomDuBien: true, adresse: true, statut: true } });

    return tousLesBiens.filter((b) => !biensAvecQuitus.has(b.numeroBien));
  }
}
