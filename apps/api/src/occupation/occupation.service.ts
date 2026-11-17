import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOccupationDto } from './dto/create-occupation.dto';
import { UpdateOccupationDto } from './dto/update-occupation.dto';
import {
  DemandeLiberationDto,
  ValiderLiberationDto,
} from './dto/liberation.dto';
import { OccupationStatus, Prisma, StatutDemande } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

import { EtatDesLieuxDto } from './dto/etat-des-lieux.dto';
import { getEtatDesLieuxTemplate } from './templates/etat-des-lieux.template';
import { NotificationService } from 'src/notification/notification.service';

// ====================== PDFMAKE ======================
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

// pdfmake 0.3.x : pdfFonts est directement le vfs
(pdfMake as any).vfs = pdfFonts;
// ====================================================

@Injectable()
export class OccupationService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  private generateNumeroOccupation(lastNumber: number): string {
    return `OCC-${(lastNumber + 1).toString().padStart(5, '0')}`;
  }

  /**
   * Synchronise le statut de la Demande liée à l'Occupation.
   * Validation libération / occupation → Demande VALIDEE
   */
  private async syncDemandeStatut(
    demandeReference: string | null | undefined,
    occupationStatut: OccupationStatus,
  ) {
    if (!demandeReference) return;

    const mapping: Partial<Record<OccupationStatus, StatutDemande>> = {
      EN_ATTENTE: StatutDemande.EN_ATTENTE,
      EN_VALIDATION: StatutDemande.EN_COURS,
      APPROUVE: StatutDemande.VALIDEE,
      EN_COURS: StatutDemande.VALIDEE,
      FIN_PROCHE: StatutDemande.EN_COURS,
      DEMANDE_LIBERATION: StatutDemande.EN_COURS,
      // ✅ Validation libération par le chef → VALIDEE (pas TERMINEE)
      LIBERATION_VALIDEE: StatutDemande.VALIDEE,
      LIBERE: StatutDemande.VALIDEE,
      SANS_TITRE: StatutDemande.EN_COURS,
    };

    const nouveauStatutDemande = mapping[occupationStatut];
    if (!nouveauStatutDemande) return;

    const data: Prisma.DemandeUpdateInput = {
      statut: nouveauStatutDemande,
    };

    if (
      nouveauStatutDemande === StatutDemande.VALIDEE ||
      nouveauStatutDemande === StatutDemande.TERMINEE
    ) {
      data.dateValidation = new Date();
    }

    try {
      await this.prisma.demande.update({
        where: { reference: demandeReference },
        data,
      });
    } catch (e) {
      console.warn(
        `Sync Demande ${demandeReference} échouée:`,
        (e as Error).message,
      );
    }
  }

  private async createAlerteFinJouissance(params: {
    agents: { id: number }[];
    occ: {
      numeroOccupation: string;
      dateSortiePrevue: Date | null;
      bien?: {
        nomDuBien?: string;
        numeroBien?: string;
        typeBien?: string;
      } | null;
      occupant?: { nom?: string; prenom?: string } | null;
    };
    daysLeft: number;
    type: 'FIN_PROCHE' | 'DEPASSEMENT';
  }) {
    const { agents, occ, daysLeft, type } = params;
    if (!agents.length) return;

    const bienLabel =
      occ.bien?.nomDuBien || occ.bien?.numeroBien || 'Bien inconnu';
    const occupantLabel = occ.occupant
      ? `${occ.occupant.prenom || ''} ${occ.occupant.nom || ''}`.trim()
      : 'Occupant inconnu';

    const titre =
      type === 'DEPASSEMENT'
        ? `Occupation sans titre : ${occ.numeroOccupation}`
        : `Fin de jouissance dans ${daysLeft} jour(s)`;

    const dateSortieStr = occ.dateSortiePrevue
      ? new Date(occ.dateSortiePrevue).toLocaleDateString('fr-FR')
      : '—';

    const message =
      type === 'DEPASSEMENT'
        ? `L'occupation ${occ.numeroOccupation} (${bienLabel} – ${occupantLabel}) a dépassé la date de sortie prévue (${dateSortieStr}). Statut passé en SANS_TITRE.`
        : `L'occupation ${occ.numeroOccupation} (${bienLabel} – ${occupantLabel}) arrive à échéance le ${dateSortieStr} (J-${daysLeft}).`;

    for (const agent of agents) {
      try {
        await this.notificationService.creerNotification({
          titre,
          message,
          type: 'ALERTE_DELAI',
          lien: `/dashboard/occupations?focus=${occ.numeroOccupation}`,
          userId: agent.id,
        });
      } catch (e) {
        console.warn('Notification non créée:', (e as Error).message);
      }
    }
  }

  // ====================== FIN PROCHE / ALERTES ======================

  async getOccupationsFinProche() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const horizon90 = new Date(today.getTime() + 90 * 86400000);

    const list = await this.prisma.occupation.findMany({
      where: {
        OR: [
          { statut: OccupationStatus.FIN_PROCHE },
          { statut: OccupationStatus.SANS_TITRE },
          {
            statut: {
              in: [OccupationStatus.EN_COURS, OccupationStatus.APPROUVE],
            },
            dateSortiePrevue: {
              not: null,
              lte: horizon90,
            },
          },
        ],
      },
      include: {
        bien: true,
        occupant: true,
        demande: true,
        validations: true,
      },
      orderBy: { dateSortiePrevue: 'asc' },
    });

    return list.map((occ) => {
      let joursRestants: number | null = null;
      if (occ.dateSortiePrevue) {
        const sortie = new Date(occ.dateSortiePrevue);
        sortie.setHours(0, 0, 0, 0);
        joursRestants = Math.ceil(
          (sortie.getTime() - today.getTime()) / 86400000,
        );
      }

      let alerteNiveau: 'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE' | 'NONE' =
        'NONE';
      if (joursRestants != null) {
        if (joursRestants <= 0) alerteNiveau = 'CRITIQUE';
        else if (joursRestants <= 7) alerteNiveau = 'HAUTE';
        else if (joursRestants <= 30) alerteNiveau = 'MOYENNE';
        else alerteNiveau = 'BASSE';
      }

      return {
        ...occ,
        joursRestants,
        alerteNiveau,
      };
    });
  }

  async handleEndOfOccupancyAlerts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const occupations = await this.prisma.occupation.findMany({
      where: {
        statut: {
          in: [
            OccupationStatus.EN_COURS,
            OccupationStatus.APPROUVE,
            OccupationStatus.FIN_PROCHE,
          ],
        },
        dateSortiePrevue: { not: null },
      },
      include: {
        occupant: true,
        bien: true,
      },
    });

    const agents = await this.prisma.user.findMany({
      where: {
        role: { in: ['CHEF_SRB', 'ADMINISTRATEUR'] },
        isActive: true,
      },
      select: { id: true },
    });

    let updatedFinProche = 0;
    let updatedSansTitre = 0;
    let notifications = 0;

    for (const occ of occupations) {
      if (!occ.dateSortiePrevue) continue;

      const sortie = new Date(occ.dateSortiePrevue);
      sortie.setHours(0, 0, 0, 0);

      const daysLeft = Math.ceil(
        (sortie.getTime() - today.getTime()) / 86400000,
      );

      const alertDelay =
        occ.bien?.typeBien === 'LOGEMENT_FONCTION' ? 30 : 90;

      if (daysLeft <= 0) {
        if (occ.statut !== OccupationStatus.SANS_TITRE) {
          await this.prisma.occupation.update({
            where: { numeroOccupation: occ.numeroOccupation },
            data: {
              statut: OccupationStatus.SANS_TITRE,
              procedureJudiciaire: true,
            },
          });
          await this.syncDemandeStatut(
            occ.demandeReference,
            OccupationStatus.SANS_TITRE,
          );
          updatedSansTitre++;
        }

        await this.createAlerteFinJouissance({
          agents,
          occ,
          daysLeft,
          type: 'DEPASSEMENT',
        });
        notifications += agents.length;
        continue;
      }

      if (daysLeft <= alertDelay) {
        if (
          occ.statut === OccupationStatus.EN_COURS ||
          occ.statut === OccupationStatus.APPROUVE
        ) {
          await this.prisma.occupation.update({
            where: { numeroOccupation: occ.numeroOccupation },
            data: { statut: OccupationStatus.FIN_PROCHE },
          });
          await this.syncDemandeStatut(
            occ.demandeReference,
            OccupationStatus.FIN_PROCHE,
          );
          updatedFinProche++;
        }

        const seuils = new Set([alertDelay, 30, 15, 7, 1]);
        if (seuils.has(daysLeft)) {
          await this.createAlerteFinJouissance({
            agents,
            occ,
            daysLeft,
            type: 'FIN_PROCHE',
          });
          notifications += agents.length;
        }
      }
    }

    return {
      ok: true,
      scanned: occupations.length,
      updatedFinProche,
      updatedSansTitre,
      notifications,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cronEndOfOccupancyAlerts() {
    await this.handleEndOfOccupancyAlerts();
  }

  // ====================== STATUT / VALIDATION ======================

  async updateStatut(numeroOccupation: string, statut: string) {
    const occupation = await this.findOne(numeroOccupation);
    const newStatus = statut as OccupationStatus;

    if (!Object.values(OccupationStatus).includes(newStatus)) {
      throw new BadRequestException(`Le statut '${statut}' n'est pas valide.`);
    }

    const updatedOccupation = await this.prisma.occupation.update({
      where: { numeroOccupation },
      data: { statut: newStatus },
      include: {
        bien: true,
        occupant: true,
        demande: true,
      },
    });

    if (newStatus === OccupationStatus.LIBERE && occupation.bienNumero) {
      await this.prisma.bien.update({
        where: { numeroBien: occupation.bienNumero },
        data: { statut: 'LIBRE' },
      });
    }

    await this.syncDemandeStatut(
      occupation.demandeReference ?? updatedOccupation.demandeReference,
      newStatus,
    );

    return updatedOccupation;
  }

  async validerOccupation(numeroOccupation: string, _user?: any) {
    const occupation = await this.findOne(numeroOccupation);

    if (
      occupation.statut !== OccupationStatus.EN_ATTENTE &&
      occupation.statut !== OccupationStatus.EN_VALIDATION
    ) {
      throw new BadRequestException(
        `Impossible de valider une occupation en statut ${occupation.statut}`,
      );
    }

    const updated = await this.prisma.occupation.update({
      where: { numeroOccupation },
      data: {
        statut: OccupationStatus.APPROUVE,
      },
      include: {
        bien: true,
        occupant: true,
        demande: true,
      },
    });

    await this.syncDemandeStatut(
      occupation.demandeReference,
      OccupationStatus.APPROUVE,
    );

    return updated;
  }

  // ====================== CRUD ======================

  async create(dto: CreateOccupationDto, user: any) {
    const occupantIdRaw = dto.occupantId ?? dto.demandeurId ?? null;
    const occupantId = occupantIdRaw ? Number(occupantIdRaw) : null;

    if (!dto.bienNumero) {
      throw new BadRequestException('Le numéro du bien est obligatoire');
    }
    if (!dto.dateEntree) {
      throw new BadRequestException("La date d'entrée est obligatoire");
    }

    const bien = await this.prisma.bien.findUnique({
      where: { numeroBien: dto.bienNumero },
    });

    if (!bien) {
      throw new NotFoundException('Bien non trouvé');
    }
    if (bien.statut !== 'LIBRE') {
      throw new BadRequestException("Le bien n'est pas disponible");
    }

    if (occupantId) {
      const occ = await this.prisma.occupant.findUnique({
        where: { occupanId: occupantId },
      });
      if (!occ) {
        throw new NotFoundException('Occupant non trouvé');
      }
    }

    const last = await this.prisma.occupation.findFirst({
      orderBy: { numeroOccupation: 'desc' },
      select: { numeroOccupation: true },
    });

    let lastNum = 0;
    if (last?.numeroOccupation?.startsWith('OCC-')) {
      lastNum = parseInt(last.numeroOccupation.split('-')[1] || '0', 10);
    }
    const numeroOccupation = this.generateNumeroOccupation(lastNum);

    const statutOccupation =
      dto.statut &&
      Object.values(OccupationStatus).includes(dto.statut as OccupationStatus)
        ? (dto.statut as OccupationStatus)
        : OccupationStatus.EN_ATTENTE;

    try {
      const occupation = await this.prisma.occupation.create({
        data: {
          numeroOccupation,
          dateEntree: new Date(dto.dateEntree),
          dateSortiePrevue: dto.dateSortiePrevue
            ? new Date(dto.dateSortiePrevue)
            : null,
          bienNumero: dto.bienNumero,
          occupantId,
          statut: statutOccupation,
          delaiJouissanceMois: dto.delaiJouissanceMois ?? null,
          motifLiberation: dto.motifLiberation ?? null,
          clesRestituees: dto.clesRestituees ?? false,
          procedureJudiciaire: dto.procedureJudiciaire ?? false,
          demandeReference: dto.demandeReference ?? null,
        },
        include: {
          bien: true,
          occupant: true,
          demande: true,
        },
      });

      await this.prisma.bien.update({
        where: { numeroBien: dto.bienNumero },
        data: { statut: 'OCCUPE' },
      });

      if (dto.demandeReference) {
        await this.syncDemandeStatut(dto.demandeReference, statutOccupation);
      }

      return occupation;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Conflit unique (numéro occupation ou demandeReference déjà utilisé)',
        );
      }
      console.error('Erreur création occupation:', error);
      throw new BadRequestException(
        error.message || "Erreur lors de la création de l'occupation",
      );
    }
  }

  async findAll(query: Prisma.OccupationWhereInput = {}) {
    return this.prisma.occupation.findMany({
      where: query,
      include: {
        bien: true,
        occupant: true,
        validations: true,
        demande: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(numeroOccupation: string) {
    if (!numeroOccupation) {
      throw new BadRequestException("Le numéro d'occupation est requis.");
    }

    const occupation = await this.prisma.occupation.findUnique({
      where: { numeroOccupation },
      include: {
        bien: true,
        occupant: true,
        validations: true,
        demande: {
          include: {
            piecesJointes: true,
          },
        },
      },
    });

    if (!occupation) {
      throw new NotFoundException('Occupation non trouvée');
    }
    return occupation;
  }

  async update(numeroOccupation: string, dto: UpdateOccupationDto) {
    const existing = await this.findOne(numeroOccupation);

    const updateData: Prisma.OccupationUpdateInput = {};

    if (dto.dateEntree) updateData.dateEntree = new Date(dto.dateEntree);
    if (dto.dateSortiePrevue) {
      updateData.dateSortiePrevue = new Date(dto.dateSortiePrevue);
    }
    if (dto.statut) updateData.statut = dto.statut;
    if (dto.clesRestituees !== undefined) {
      updateData.clesRestituees = dto.clesRestituees;
    }
    if (dto.motifLiberation) updateData.motifLiberation = dto.motifLiberation;
    if ((dto as any).procedureJudiciaire !== undefined) {
      (updateData as any).procedureJudiciaire = (
        dto as any
      ).procedureJudiciaire;
    }
    if ((dto as any).delaiJouissanceMois !== undefined) {
      (updateData as any).delaiJouissanceMois = (
        dto as any
      ).delaiJouissanceMois;
    }

    if (dto.demandeurId) {
      updateData.occupant = {
        connect: { occupanId: dto.demandeurId },
      };
    }
    if ((dto as any).occupantId) {
      updateData.occupant = {
        connect: { occupanId: Number((dto as any).occupantId) },
      };
    }
    if (dto.bienNumero) {
      updateData.bien = {
        connect: { numeroBien: dto.bienNumero },
      };
    }

    const updated = await this.prisma.occupation.update({
      where: { numeroOccupation },
      data: updateData,
      include: { bien: true, occupant: true, demande: true },
    });

    if (dto.statut && dto.statut !== existing.statut) {
      await this.syncDemandeStatut(
        existing.demandeReference ?? updated.demandeReference,
        dto.statut as OccupationStatus,
      );
    }

    return updated;
  }

  async remove(numeroOccupation: string) {
    const occupation = await this.findOne(numeroOccupation);

    if (occupation.bienNumero) {
      await this.prisma.bien.update({
        where: { numeroBien: occupation.bienNumero },
        data: { statut: 'LIBRE' },
      });
    }

    return this.prisma.occupation.delete({
      where: { numeroOccupation },
    });
  }

  // ====================== ÉTATS DES LIEUX ======================

  async updateEtatDesLieux(
    numeroOccupation: string,
    type: 'ENTREE' | 'SORTIE',
    formulaire: EtatDesLieuxDto,
    _user: any,
  ) {
    const occupation = await this.findOne(numeroOccupation);
    const dataToUpdate: any = {};

    if (type === 'ENTREE') {
      dataToUpdate.etatDesLieuxEntree = formulaire;
      if (occupation.statut === OccupationStatus.EN_ATTENTE) {
        dataToUpdate.statut = OccupationStatus.EN_COURS;
      }
    } else {
      dataToUpdate.etatDesLieuxSortie = formulaire;
    }

    const updated = await this.prisma.occupation.update({
      where: { numeroOccupation },
      data: dataToUpdate,
      include: { bien: true, occupant: true, demande: true },
    });

    if (dataToUpdate.statut) {
      await this.syncDemandeStatut(
        occupation.demandeReference,
        dataToUpdate.statut,
      );
    }

    return updated;
  }

  // ====================== LIBÉRATION ======================

  async demanderLiberation(
    numeroOccupation: string,
    dto: DemandeLiberationDto,
    _user: any,
  ) {
    const occupation = await this.findOne(numeroOccupation);

    if (
      occupation.statut !== OccupationStatus.EN_COURS &&
      occupation.statut !== OccupationStatus.APPROUVE &&
      occupation.statut !== OccupationStatus.FIN_PROCHE
    ) {
      throw new BadRequestException(
        `Occupation non éligible à la libération (statut: ${occupation.statut})`,
      );
    }

    const demandeRef =
      (dto as any).demandeReference || occupation.demandeReference || null;

    const updated = await this.prisma.occupation.update({
      where: { numeroOccupation },
      data: {
        statut: OccupationStatus.DEMANDE_LIBERATION,
        motifLiberation: dto.motifLiberation ?? occupation.motifLiberation,
        dateSortiePrevue: dto.dateSortieSouhaitee
          ? new Date(dto.dateSortieSouhaitee)
          : occupation.dateSortiePrevue,
        ...(demandeRef ? { demandeReference: demandeRef } : {}),
      },
      include: { bien: true, occupant: true, demande: true },
    });

    // Bien en cours de libération (optionnel)
    try {
      await this.prisma.bien.update({
        where: { numeroBien: occupation.bienNumero },
        data: { statut: 'EN_LIBERATION' },
      });
    } catch {
      // ignore si l'enum n'a pas EN_LIBERATION
    }

    // Demande liée → EN_COURS
    if (demandeRef) {
      try {
        await this.prisma.demande.update({
          where: { reference: demandeRef },
          data: { statut: StatutDemande.EN_COURS },
        });
      } catch {
        await this.syncDemandeStatut(
          demandeRef,
          OccupationStatus.DEMANDE_LIBERATION,
        );
      }
    }

    return updated;
  }

  /**
   * Validation par le chef → Occupation LIBERE, Bien LIBRE, Demande VALIDEE
   */
  async validerLiberation(
    numeroOccupation: string,
    dto: ValiderLiberationDto,
    _validateur: any,
  ) {
    const occupation = await this.findOne(numeroOccupation);

    if (occupation.statut !== OccupationStatus.DEMANDE_LIBERATION) {
      throw new BadRequestException(
        'Aucune demande de libération en attente pour cette occupation',
      );
    }

    const updatedOccupation = await this.prisma.occupation.update({
      where: { numeroOccupation },
      data: {
        statut: OccupationStatus.LIBERE,
        dateSortieReelle: dto.dateSortieReelle
          ? new Date(dto.dateSortieReelle)
          : new Date(),
        clesRestituees: dto.clesRestituees ?? false,
        motifLiberation:
          (dto as any).motifLiberation ?? occupation.motifLiberation ?? undefined,
      },
      include: { bien: true, occupant: true, demande: true },
    });

    // Bien → LIBRE
    await this.prisma.bien.update({
      where: { numeroBien: occupation.bienNumero },
      data: { statut: 'LIBRE' },
    });

    // Demande liée → VALIDEE (approuvée par le chef)
    const demandeRef =
      occupation.demandeReference ?? updatedOccupation.demandeReference;

    if (demandeRef) {
      await this.prisma.demande.update({
        where: { reference: demandeRef },
        data: {
          statut: StatutDemande.VALIDEE,
          dateValidation: new Date(),
        },
      });
    } else {
      await this.syncDemandeStatut(
        updatedOccupation.demandeReference,
        OccupationStatus.LIBERE,
      );
    }

    return updatedOccupation;
  }

  // ====================== PDF ======================

  async generateEtatDesLieuxPdf(
    numeroOccupation: string,
    formulaire: EtatDesLieuxDto,
  ): Promise<Buffer> {
    if (!formulaire?.pieces?.length) {
      throw new BadRequestException('Formulaire ou liste des pièces manquante');
    }

    await this.findOne(numeroOccupation);

    const dataForTemplate = {
      ...formulaire,
      date: formulaire.date || new Date().toISOString().slice(0, 10),
      lieu: formulaire.lieu || 'Fianarantsoa',
      descriptionBien:
        formulaire.descriptionBien || `Occupation n° ${numeroOccupation}`,
    };

    const docDefinition = getEtatDesLieuxTemplate(
      dataForTemplate,
    ) as unknown as TDocumentDefinitions;

    return new Promise((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMake.createPdf(docDefinition);

        pdfDocGenerator
          .getBuffer()
          .then((buffer: Buffer) => {
            if (!buffer || buffer.length === 0) {
              reject(new BadRequestException('Buffer PDF vide'));
              return;
            }
            resolve(buffer);
          })
          .catch((err) => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  }
}