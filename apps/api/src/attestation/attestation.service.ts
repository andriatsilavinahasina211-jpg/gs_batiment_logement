import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAttestationDto } from './dto/create-attestation.dto';
import { TypeAttestation, StatutAttestation, StatutDemande, TypeDemande } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { getAttestationTemplate } from './templates/attestation.template';
import { DemandeService } from 'src/demande/demande.service';

const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
// pdfmake 0.3.x : pdfFonts est directement le vfs (pas .vfs ni .pdfMake.vfs)
pdfMake.vfs = pdfFonts;
pdfMake.fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};
const pdfMakeInstance = pdfMake;

@Injectable()
export class AttestationService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => DemandeService))
    private demandeService: DemandeService,
  ) {}

  async create(dto: CreateAttestationDto, user: any) {
    if (!dto.visaSuperieur) {
      throw new BadRequestException(
        'Attestation refusée (Section 6.5.2) : Visa du supérieur hiérarchique obligatoire.',
      );
    }
    if (!dto.declarationHonneurLegalisee) {
      throw new BadRequestException(
        "Attestation refusée (Section 6.5.2) : Déclaration sur l'honneur légalisée obligatoire.",
      );
    }

    if (
      dto.typeAttestation !== TypeAttestation.NON_LOGEMENT &&
      dto.typeAttestation !== TypeAttestation.NON_OCCUPATION
    ) {
      throw new BadRequestException(
        'Type d\'attestation invalide (NON_LOGEMENT | NON_OCCUPATION)',
      );
    }

    const demandeur = await this.prisma.occupant.findUnique({
      where: { occupanId: dto.demandeurId },
    });
    if (!demandeur) {
      throw new NotFoundException('Occupant (demandeur) non trouvé');
    }

    const occupationActive = await this.prisma.occupation.findFirst({
      where: {
        occupantId: dto.demandeurId,
        statut: {
          in: ['EN_COURS', 'APPROUVE', 'EN_VALIDATION', 'FIN_PROCHE'],
        },
      },
    });

    const bailActif = await this.prisma.bail.findFirst({
      where: {
        locataireId: dto.demandeurId,
        statut: {
          in: [
            'EN_COURS',
            'VISA_CF_VALIDE',
            'VISA_CF_SOUMIS',
            'EN_ATTENTE_MEF',
          ],
        },
      },
    });

    // Les deux types : absence d'occupation / bail actif
    if (occupationActive || bailActif) {
      const label =
        dto.typeAttestation === TypeAttestation.NON_OCCUPATION
          ? 'non-occupation'
          : 'non-logement';
      throw new BadRequestException(
        `Attestation de ${label} refusée : le demandeur a déjà une occupation ou un bail administratif actif.`,
      );
    }

    const reference = `ATT-${uuidv4().slice(0, 8).toUpperCase()}`;

    return this.prisma.attestation.create({
      data: {
        reference,
        typeAttestation: dto.typeAttestation,
        statut: StatutAttestation.BROUILLON,
        visaSuperieur: true,
        declarationHonneurLegalisee: true,
        contenu: {
          demandeReference: dto.demandeReference ?? null,
          commentaire: dto.commentaire ?? null,
          dateDemande: new Date().toISOString(),
          type: dto.typeAttestation,
          civilite: dto.civilite ?? null,
          decretNumero: dto.decretNumero ?? null,
          decretDate: dto.decretDate ?? null,
          datePriseService: dto.datePriseService ?? null,
          numeroOrdre: dto.numeroOrdre ?? null,
        },
        demandeurId: dto.demandeurId,
        createdById: user.id,
      },
      include: { demandeur: true, createdBy: true },
    });
  }

  async findAll() {
    return this.prisma.attestation.findMany({
      include: { demandeur: true, createdBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const attestation = await this.prisma.attestation.findUnique({
      where: { id },
      include: { demandeur: true, createdBy: true },
    });
    if (!attestation) {
      throw new NotFoundException('Attestation non trouvée');
    }
    return attestation;
  }

  /** Validation Chef → VALIDEE + dateGeneration + validation automatique de la Demande */
  async valider(id: string, user?: any) {
    const attestation = await this.findOne(id);

    if (
      attestation.statut === StatutAttestation.VALIDEE ||
      attestation.statut === StatutAttestation.GENERE
    ) {
      throw new BadRequestException('Cette attestation est déjà validée');
    }

    const updated = await this.prisma.attestation.update({
      where: { id },
      data: {
        statut: StatutAttestation.VALIDEE,
        dateGeneration: new Date(),
      },
      include: { demandeur: true },
    });

    // Synchronisation automatique : validation de la demande d'attestation
    try {
      const contenu = (attestation.contenu as any) || {};
      let demande: any = null;

      if (contenu.demandeReference) {
        demande = await this.prisma.demande.findUnique({
          where: { reference: contenu.demandeReference },
        });
      }

      if (!demande) {
        demande = await this.prisma.demande.findFirst({
          where: {
            demandeurId: attestation.demandeurId,
            typeDemande: TypeDemande.ATTESTATION,
            statut: { in: [StatutDemande.EN_ATTENTE, StatutDemande.EN_COURS] },
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (
        demande &&
        (demande.statut === StatutDemande.EN_ATTENTE ||
          demande.statut === StatutDemande.EN_COURS)
      ) {
        await this.demandeService.updateStatut(
          demande.reference,
          StatutDemande.VALIDEE,
          'Attestation validée par le Chef SRB',
          user?.id ? Number(user.id) : undefined,
        );
      }
    } catch (err) {
      console.error(
        '[AttestationService] Erreur lors de la synchronisation de validation de la demande:',
        err,
      );
    }

    return updated;
  }

  /** Refus Chef → ARCHIVEE / Refusée avec motif + refus automatique de la Demande */
  async refuser(id: string, motif: string, user?: any) {
    if (!motif || !motif.trim()) {
      throw new BadRequestException(
        'Le motif de refus est obligatoire pour motiver la décision.',
      );
    }

    const attestation = await this.findOne(id);

    if (
      attestation.statut === StatutAttestation.VALIDEE ||
      attestation.statut === StatutAttestation.GENERE
    ) {
      throw new BadRequestException(
        'Une attestation déjà validée ou générée ne peut plus être refusée',
      );
    }

    const contenu = (attestation.contenu as any) || {};
    const updatedContenu = {
      ...contenu,
      refusee: true,
      motifRefus: motif.trim(),
      dateRefus: new Date().toISOString(),
      refuseParId: user?.id ? Number(user.id) : null,
    };

    const updated = await this.prisma.attestation.update({
      where: { id },
      data: {
        statut: StatutAttestation.ARCHIVEE,
        contenu: updatedContenu,
      },
      include: { demandeur: true },
    });

    // Synchronisation automatique : rejet de la demande d'attestation
    try {
      let demande: any = null;
      if (contenu.demandeReference) {
        demande = await this.prisma.demande.findUnique({
          where: { reference: contenu.demandeReference },
        });
      }

      if (!demande) {
        demande = await this.prisma.demande.findFirst({
          where: {
            demandeurId: attestation.demandeurId,
            typeDemande: TypeDemande.ATTESTATION,
            statut: { in: [StatutDemande.EN_ATTENTE, StatutDemande.EN_COURS] },
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (
        demande &&
        (demande.statut === StatutDemande.EN_ATTENTE ||
          demande.statut === StatutDemande.EN_COURS)
      ) {
        await this.demandeService.updateStatut(
          demande.reference,
          StatutDemande.REJETEE,
          motif.trim(),
          user?.id ? Number(user.id) : undefined,
        );
      }
    } catch (err) {
      console.error(
        '[AttestationService] Erreur lors de la synchronisation de rejet de la demande:',
        err,
      );
    }

    return updated;
  }

  /** PDF — uniquement si VALIDEE ou GENERE */
  async generatePdf(id: string): Promise<Buffer> {
    const attestation = await this.findOne(id);

    if (
      attestation.statut !== StatutAttestation.VALIDEE &&
      attestation.statut !== StatutAttestation.GENERE
    ) {
      throw new BadRequestException(
        "Le PDF n'est disponible qu'après validation par le Chef SRB",
      );
    }

    if (!attestation.demandeur) {
      throw new BadRequestException("Demandeur manquant sur l'attestation");
    }

    const contenu = (attestation.contenu as any) || {};

    const docDefinition = getAttestationTemplate({
      reference: attestation.reference,
      typeAttestation: attestation.typeAttestation as
        | 'NON_LOGEMENT'
        | 'NON_OCCUPATION',
      dateGeneration: attestation.dateGeneration || new Date(),
      demandeur: {
        nom: attestation.demandeur.nom,
        prenom: attestation.demandeur.prenom,
        matricule: attestation.demandeur.matricule,
        cin: attestation.demandeur.cin ?? undefined,
        ministere: attestation.demandeur.ministere ?? undefined,
        fonction: attestation.demandeur.fonction ?? undefined,
      },
      lieu: 'Fianarantsoa',
      civilite: contenu.civilite,
      decretNumero: contenu.decretNumero,
      decretDate: contenu.decretDate,
      datePriseService: contenu.datePriseService,
      numeroOrdre: contenu.numeroOrdre,
    });

    // Marquer comme GENERE si encore VALIDEE
    if (attestation.statut === StatutAttestation.VALIDEE) {
      await this.prisma.attestation.update({
        where: { id },
        data: { statut: StatutAttestation.GENERE },
      });
    }

    // pdfmake 0.3.x : getBuffer() retourne une Promise (plus de callback)
    const buffer: Buffer = await pdfMakeInstance
      .createPdf(docDefinition)
      .getBuffer();

    if (!buffer?.length) {
      throw new Error('Buffer PDF vide généré par pdfmake');
    }

    return buffer;
  }
}