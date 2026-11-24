import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDemandeDto } from './dto/create-demande.dto';
import { UpdateDemandeDto } from './dto/update-demande.dto';
import {
  Notification,
  StatutAttestation,
  StatutBien,
  StatutDemande,
  StatutTravaux,
  TypeDemande,
  TypeNotification,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { RecensementService } from 'src/recensement/recensement.service';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class DemandeService {
  constructor(
    private prisma: PrismaService,
    private recensementService: RecensementService,
    private notificationService: NotificationService,
  ) {}

  async create(dto: CreateDemandeDto, createdById: number) {
    const occupant = await this.prisma.occupant.findUnique({
      where: { occupanId: dto.demandeurId },
    });
    if (!occupant) throw new NotFoundException('Occupant demandeur non trouvé');

    if (dto.typeDemande === TypeDemande.TRAVAUX && !dto.travaux) {
      throw new BadRequestException(
        'Les informations des travaux sont obligatoires',
      );
    }

    if (dto.typeDemande === TypeDemande.TRAVAUX && !dto.bienNumero) {
      throw new BadRequestException(
        'Le bien concerné par les travaux est obligatoire',
      );
    }

    if (
      dto.typeDemande === TypeDemande.TRAVAUX &&
      (!Number.isInteger(createdById) || createdById <= 0)
    ) {
      throw new BadRequestException(
        "L'utilisateur créant les travaux est invalide",
      );
    }

    if (dto.typeDemande === TypeDemande.RECENSEMENT && !dto.bienNumero) {
      throw new BadRequestException(
        'Le bien concerné par le recensement est obligatoire',
      );
    }

    if (
      dto.typeDemande === TypeDemande.RECENSEMENT &&
      (!Number.isInteger(createdById) || createdById <= 0)
    ) {
      throw new BadRequestException(
        "L'utilisateur créant le recensement est invalide",
      );
    }

    if (dto.bienNumero) {
      const bien = await this.prisma.bien.findUnique({
        where: { numeroBien: dto.bienNumero },
      });
      if (!bien) throw new NotFoundException('Bien concerné non trouvé');
    }

    const reference = `DEM-${uuidv4().slice(0, 8).toUpperCase()}`;

    const travauxDto =
      dto.typeDemande === TypeDemande.TRAVAUX ? dto.travaux : undefined;
    const dateDebutPrevue = travauxDto
      ? new Date(travauxDto.dateDebutPrevue)
      : null;
    const dateFinPrevue = travauxDto
      ? new Date(travauxDto.dateFinPrevue)
      : null;

    if (
      dateDebutPrevue &&
      dateFinPrevue &&
      (Number.isNaN(dateDebutPrevue.getTime()) ||
        Number.isNaN(dateFinPrevue.getTime()) ||
        dateDebutPrevue >= dateFinPrevue)
    ) {
      throw new BadRequestException(
        'La date de fin prévue doit être postérieure à la date de début.',
      );
    }

    const anneeN = new Date().getFullYear();
    const quitusN1Present =
      travauxDto && dto.bienNumero
        ? await this.recensementService.verifierQuitusN1(dto.bienNumero, anneeN)
        : undefined;

    const notifications: Notification[] = [];
    const createdDemand = await this.prisma.$transaction(async (tx) => {
      if (travauxDto && dto.bienNumero) {
        const travauxEnCours = await tx.travaux.findFirst({
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
      }

      const demande = await tx.demande.create({
        data: {
          reference,
          typeDemande: dto.typeDemande,
          description: dto.description,
          demandeurId: dto.demandeurId,
          bienNumero: dto.bienNumero || null,
          statut: dto.statut ?? StatutDemande.EN_ATTENTE,
        },
        include: {
          demandeur: true,
          bien: true,
          validations: true,
        },
      });

      const reviewers = await tx.user.findMany({
        where: {
          role: { in: ['CHEF_SRB', 'ADMINISTRATEUR'] },
          isActive: true,
        },
        select: { id: true },
      });
      const demandeTypeLabels: Record<TypeDemande, string> = {
        BAIL: 'de bail',
        OCCUPATION: "d'occupation",
        LIBERATION: 'de libération',
        ATTESTATION: "d'attestation",
        RECENSEMENT: 'de recensement',
        TRAVAUX: 'de travaux',
      };
      const demandeur = `${occupant.prenom || ''} ${occupant.nom || ''}`.trim();
      for (const reviewer of reviewers) {
        notifications.push(
          await tx.notification.create({
            data: {
              userId: reviewer.id,
              titre: `Nouvelle demande ${demandeTypeLabels[dto.typeDemande]} à traiter`,
              message: `Une nouvelle demande ${demandeTypeLabels[dto.typeDemande]} (réf. ${reference}) a été soumise par ${demandeur}.`,
              type: TypeNotification.VALIDATION,
              lien: 'demandes',
            },
          }),
        );
      }

      if (dto.typeDemande === TypeDemande.RECENSEMENT) {
        const bienNumero = dto.bienNumero;
        const recensement = dto.recensement;
        if (!bienNumero || !recensement) {
          throw new BadRequestException(
            'Le bien et les informations du recensement sont obligatoires',
          );
        }

        const quitus = await this.recensementService.createQuitusDepuisDemande(
          tx,
          {
            ...recensement,
            bienNumero,
            occupantId: dto.demandeurId,
          },
          createdById,
        );
        return { ...demande, quitus };
      }

      if (
        !travauxDto ||
        !dto.bienNumero ||
        !dateDebutPrevue ||
        !dateFinPrevue
      ) {
        return demande;
      }

      const travauxReference = `TRAV-${anneeN}-${Date.now().toString().slice(-5)}`;
      const travaux = await tx.travaux.create({
        data: {
          reference: travauxReference,
          bienNumero: dto.bienNumero,
          typeTravaux: travauxDto.typeTravaux,
          dateDebutPrevue,
          dateFinPrevue,
          montantEstimatif: travauxDto.montantEstimatif,
          observations: travauxDto.observations,
          quitusN1Present: quitusN1Present ?? false,
          statut: StatutTravaux.EN_ATTENTE,
          createdById,
        },
        include: {
          bien: true,
          createdBy: { select: { nom: true, prenom: true, matricule: true } },
        },
      });

      await tx.bien.update({
        where: { numeroBien: dto.bienNumero },
        data: { statut: StatutBien.EN_TRAVAUX },
      });

      await tx.historiqueTravaux.create({
        data: {
          travauxId: travaux.id,
          action: 'CREATION',
          nouvelleValeur: JSON.stringify({
            reference: travauxReference,
            statut: StatutTravaux.EN_ATTENTE,
            quitusN1Present,
          }),
          commentaire: `Chantier créé. Quitus N-1 ${quitusN1Present ? 'présent ✓' : 'ABSENT ⚠️ (non conforme Circulaire N°813)'}`,
          userId: createdById,
        },
      });

      if (!quitusN1Present) {
        console.warn(
          `[ALERTE CONFORMITÉ] Travaux créés pour bien ${dto.bienNumero} sans Quitus N-1 (${anneeN - 1}). Non conforme Circulaire N°813.`,
        );
      }

      return { ...demande, travaux };
    });

    notifications.forEach((notification) =>
      this.notificationService.publishCreated(notification),
    );
    return createdDemand;
  }

  async findAll(
    query: {
      statut?: StatutDemande;
      demandeurId?: number;
      search?: string;
    } = {},
  ) {
    const where: any = {};
    if (query.statut) where.statut = query.statut;
    if (query.demandeurId) where.demandeurId = Number(query.demandeurId);
    if (query.search) {
      where.OR = [
        { reference: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { demandeur: { nom: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.demande.findMany({
      where,
      include: {
        demandeur: true,
        bien: true,
        validations: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(reference: string) {
    const demande = await this.prisma.demande.findUnique({
      where: { reference },
      include: {
        demandeur: true,
        bien: true,
        validations: true,
      },
    });
    if (!demande) throw new NotFoundException('Demande non trouvée');
    return demande;
  }

  async update(reference: string, dto: UpdateDemandeDto) {
    await this.findOne(reference);

    return this.prisma.demande.update({
      where: { reference },
      data: dto,
      include: {
        demandeur: true,
        bien: true,
      },
    });
  }

  async updateStatut(
    reference: string,
    statut: StatutDemande,
    motifRefus?: string,
    valideurId?: number,
  ) {
    const existing = await this.findOne(reference);

    const updateData: any = { statut };
    if (statut === StatutDemande.REJETEE && motifRefus) {
      updateData.motif = motifRefus;
    }
    if (statut === StatutDemande.VALIDEE) {
      updateData.dateValidation = new Date();
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedDemande = await tx.demande.update({
        where: { reference },
        data: updateData,
        include: {
          demandeur: true,
          bien: true,
        },
      });

      // Si un valideurId est fourni, enregistrer la trace dans la table Validation
      if (valideurId) {
        await tx.validation.create({
          data: {
            niveau: 1,
            typeValidation: 'CHEF_SRB',
            statut:
              statut === StatutDemande.VALIDEE
                ? 'VALIDEE'
                : statut === StatutDemande.REJETEE
                ? 'REJETEE'
                : 'EN_ATTENTE',
            commentaire: motifRefus || (statut === StatutDemande.VALIDEE ? 'Demande approuvée' : null),
            dateValidation: new Date(),
            valideurId,
            demandeReference: reference,
          },
        });
      }

      // Synchronisation avec l'attestation si la demande est de type ATTESTATION
      if (existing.typeDemande === TypeDemande.ATTESTATION) {
        const attestations = await tx.attestation.findMany({
          where: {
            demandeurId: existing.demandeurId,
            statut: StatutAttestation.BROUILLON,
          },
          orderBy: { createdAt: 'desc' },
        });

        const target =
          attestations.find(
            (a) => (a.contenu as any)?.demandeReference === reference,
          ) || attestations[0];

        if (target) {
          if (statut === StatutDemande.VALIDEE) {
            await tx.attestation.update({
              where: { id: target.id },
              data: {
                statut: StatutAttestation.VALIDEE,
                dateGeneration: new Date(),
                contenu: {
                  ...((target.contenu as any) || {}),
                  demandeReference: reference,
                },
              },
            });
          } else if (statut === StatutDemande.REJETEE) {
            await tx.attestation.update({
              where: { id: target.id },
              data: {
                statut: StatutAttestation.ARCHIVEE,
                contenu: {
                  ...((target.contenu as any) || {}),
                  demandeReference: reference,
                  refusee: true,
                  motifRefus: motifRefus || 'Demande d\'attestation rejetée',
                  dateRefus: new Date().toISOString(),
                  refuseParId: valideurId || null,
                },
              },
            });
          }
        }
      }

      // Créer une notification automatique pour le demandeur ou créateur
      const destinataireId = existing.createdById || existing.demandeurId;
      let notification: Notification | null = null;
      if (destinataireId) {
        const titre =
          statut === StatutDemande.VALIDEE
            ? `Demande ${reference} validée`
            : statut === StatutDemande.REJETEE
            ? `Demande ${reference} refusée`
            : `Mise à jour sur votre demande ${reference}`;

        const message =
          statut === StatutDemande.REJETEE && motifRefus
            ? `Votre demande ${reference} (${existing.typeDemande}) a été rejetée. Motif : "${motifRefus}".`
            : statut === StatutDemande.VALIDEE
            ? `Votre demande ${reference} (${existing.typeDemande}) a été approuvée par le Chef de Service.`
            : `Le statut de votre demande ${reference} est désormais ${statut}.`;

        notification = await tx.notification.create({
          data: {
            titre,
            message,
            type: TypeNotification.VALIDATION,
            userId: destinataireId,
            lien: 'demandes',
          },
        });
      }

      return { updatedDemande, notification };
    });

    if (result.notification) {
      this.notificationService.publishCreated(result.notification);
    }
    return result.updatedDemande;
  }

  async remove(reference: string) {
    await this.findOne(reference);
    await this.prisma.validation.deleteMany({
      where: { demandeReference: reference },
    });

    return this.prisma.demande.delete({
      where: { reference },
    });
  }
}
