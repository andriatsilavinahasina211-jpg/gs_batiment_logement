import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBailDto } from './dto/create-bail.dto';
import { UpdateBailDto } from './dto/update-bail.dto';
import { UpdateChecklistDto } from './dto/checklist.dto';
import { RenouvellementDto } from './dto/renouvellement.dto';
import { StatutBail, StatutDemande } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { getContratBailTemplate } from './templates/contrat-bail.templates';
import { CreateAvenantDto } from './dto/create-avenant.dto';
import { getAvenantTemplate } from './templates/avenant-templates';
import {
  AccordMefDto,
  VisaCfDto,
  EnregistrementFiscalDto,
} from './dto/circuit.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');

// pdfmake 0.3.x : pdfFonts est directement le vfs
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
export class BailService {
  constructor(private prisma: PrismaService) {}

  private readonly CHECKLIST_OBLIGATOIRE = [
    {
      type: 'NOTE_PRESENTATION',
      label:
        'Note de présentation (signée par DG/SG si augmentation loyer)',
      obligatoire: true,
      facultatifAvenant: false,
    },
    {
      type: 'CONTRAT_7_EXEMPLAIRES',
      label: '7 exemplaires originaux du contrat de bail (Annexe 40)',
      obligatoire: true,
      facultatifAvenant: false,
    },
    {
      type: 'ACTE_NOMINATION',
      label: 'Acte de nomination (logement ou bureau-logement)',
      obligatoire: true,
      facultatifAvenant: true,
    },
    {
      type: 'CISJ',
      label: 'CISJ original datant de moins de 3 mois',
      obligatoire: true,
      facultatifAvenant: true,
    },
    {
      type: 'LETTRE_CREANCIER',
      label:
        "Lettre d'autorisation à contracter si propriété grevée d'hypothèque",
      obligatoire: false,
      facultatifAvenant: true,
    },
    {
      type: 'FICHE_CENTRALISATION',
      label:
        "Fiche de Centralisation Comptable signée par l'Ordonnateur Secondaire",
      obligatoire: true,
      facultatifAvenant: false,
    },
    {
      type: 'ETAT_DES_LIEUX',
      label:
        'État des lieux établi par SLBA/SRB et signé par les deux parties',
      obligatoire: true,
      facultatifAvenant: true,
    },
    {
      type: 'ATTESTATION_NON_LOGEMENT',
      label: 'Attestation de non logement délivrée par DPE/SRB',
      obligatoire: true,
      facultatifAvenant: true,
    },
    {
      type: 'FICHE_PAIE',
      label: 'Fiche de paie du fonctionnaire bénéficiaire (3 derniers mois)',
      obligatoire: true,
      facultatifAvenant: false,
    },
    {
      type: 'RENONCIATION_INDEMNITE',
      label:
        "Lettre de renonciation à l'indemnité de logement (Rubrique 570, Annexe 41) légalisée",
      obligatoire: true,
      facultatifAvenant: false,
    },
    {
      type: 'RIB_BAILLEUR',
      label: "Relevé d'Identité Bancaire (RIB) du bailleur",
      obligatoire: true,
      facultatifAvenant: false,
    },
    {
      type: 'PHOTOS_IMMEUBLE',
      label:
        "Photos A4 de l'immeuble (vue d'ensemble, face, profil avec enseigne si bureau)",
      obligatoire: true,
      facultatifAvenant: true,
    },
    {
      type: 'NIF_BAILLEUR',
      label: 'Photocopie certifiée par la DGI du NIF du Bailleur',
      obligatoire: true,
      facultatifAvenant: false,
    },
    {
      type: 'STAT_BAILLEUR',
      label: 'Photocopie certifiée de la Carte Statistique du Bailleur',
      obligatoire: true,
      facultatifAvenant: false,
    },
    {
      type: 'ACTE_ETAT_CIVIL',
      label:
        'Livret de famille, acte de mariage ou certificat de célibat/divorce/veuvage',
      obligatoire: true,
      facultatifAvenant: false,
    },
  ];

  private async syncDemandeStatut(
    demandeReference: string | null | undefined,
    statutDemande: StatutDemande,
  ) {
    if (!demandeReference) return;
    try {
      await this.prisma.demande.update({
        where: { reference: demandeReference },
        data: {
          statut: statutDemande,
          ...(statutDemande === StatutDemande.VALIDEE
            ? { dateValidation: new Date() }
            : {}),
        },
      });
    } catch {
      // Demande absente : ne pas bloquer
    }
  }

  async verifierUniciteAvantage(
    locataireId: number,
    currentNumeroBail?: string,
  ) {
    const occupationActive = await this.prisma.occupation.findFirst({
      where: {
        occupantId: locataireId,
        statut: {
          in: ['EN_COURS', 'APPROUVE', 'EN_VALIDATION', 'FIN_PROCHE'],
        },
      },
    });

    if (occupationActive) {
      throw new BadRequestException(
        `Violation du principe d'unicité d'avantage logement : L'occupant bénéficie déjà d'un logement de fonction actif (Occupation n° ${occupationActive.numeroOccupation}).`,
      );
    }

    const bailActif = await this.prisma.bail.findFirst({
      where: {
        locataireId,
        numeroBail: currentNumeroBail
          ? { not: currentNumeroBail }
          : undefined,
        statut: {
          in: [
            StatutBail.EN_COURS,
            StatutBail.VISA_CF_VALIDE,
            StatutBail.VISA_CF_SOUMIS,
            StatutBail.EN_ATTENTE_MEF,
          ],
        },
      },
    });

    if (bailActif) {
      throw new BadRequestException(
        `Violation du principe d'unicité d'avantage logement : L'occupant bénéficie déjà d'un bail à loyer administratif actif (Bail n° ${bailActif.numeroBail}).`,
      );
    }
  }

  verifierClausesInterdites(data: {
    montantLoyer?: number;
    devise?: string;
    descriptionOrText?: string;
    isCisjEtat?: boolean;
    estBailleurMembreHautEmploi?: boolean;
    estBailleurEpoux?: boolean;
  }) {
    const interdits = [
      'caution',
      'dépôt de garantie',
      'intérêt moratoire',
      'pénalité de retard',
      'tacite reconduction',
      'reconduction tacite',
      'durée indéterminée',
      'paiement mois en cours',
    ];

    if (data.descriptionOrText) {
      const texteLower = data.descriptionOrText.toLowerCase();
      const trouve = interdits.find((mot) => texteLower.includes(mot));
      if (trouve) {
        throw new BadRequestException(
          `Clause interdite détectée (Section 6.5.3.3) : "${trouve}".`,
        );
      }
    }

    if (
      data.devise &&
      !['MGA', 'ARIARY'].includes(data.devise.toUpperCase())
    ) {
      throw new BadRequestException(
        'Clause interdite : le loyer doit être en Ariary (MGA).',
      );
    }

    if (data.isCisjEtat) {
      throw new BadRequestException(
        "Clause interdite : CISJ au nom de l'État non admis pour un bail privé.",
      );
    }

    if (data.estBailleurMembreHautEmploi) {
      throw new BadRequestException(
        "Clause interdite : un Haut Emploi ne peut être bailleur en sa faveur.",
      );
    }

    if (data.estBailleurEpoux) {
      throw new BadRequestException(
        'Clause interdite : location entre époux interdite.',
      );
    }
  }

  async create(dto: CreateBailDto, _user: any) {
    await this.verifierUniciteAvantage(dto.locataireId);
    this.verifierClausesInterdites({ montantLoyer: dto.montantLoyer });

    const bien = await this.prisma.bien.findUnique({
      where: { numeroBien: dto.bienNumero },
    });
    if (!bien) throw new NotFoundException('Bien non trouvé');
    if (bien.statut !== 'LIBRE') {
      throw new BadRequestException(
        "Le bien n'est pas disponible pour un bail",
      );
    }

    const locataire = await this.prisma.occupant.findUnique({
      where: { occupanId: dto.locataireId },
    });
    if (!locataire) {
      throw new NotFoundException('Occupant (locataire) non trouvé');
    }

    if (dto.demandeReference) {
      const dem = await this.prisma.demande.findUnique({
        where: { reference: dto.demandeReference },
      });
      if (!dem) {
        throw new NotFoundException(
          `Demande ${dto.demandeReference} introuvable`,
        );
      }
    }

    const numeroBail = `BAIL-${uuidv4().slice(0, 8).toUpperCase()}`;

    const bail = await this.prisma.bail.create({
      data: {
        numeroBail,
        dateDebut: new Date(dto.dateDebut),
        dateFin: new Date(dto.dateFin),
        montantLoyer: dto.montantLoyer,
        nomBailleur: dto.nomBailleur,
        nifBailleur: dto.nifBailleur,
        statBailleur: dto.statBailleur,
        ribBailleur: dto.ribBailleur,
        bienNumero: dto.bienNumero,
        locataireId: dto.locataireId,
        statut: StatutBail.EN_ATTENTE_MEF,
        demandeReference: dto.demandeReference ?? null,
      },
      include: { bien: true, locataire: true, demande: true },
    });

    await this.prisma.bien.update({
      where: { numeroBien: dto.bienNumero },
      data: { statut: 'OCCUPE' },
    });

    return bail;
  }

  async findAll(query: any = {}) {
    return this.prisma.bail.findMany({
      where: query,
      include: { bien: true, locataire: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(numeroBail: string) {
    const bail = await this.prisma.bail.findUnique({
      where: { numeroBail },
      include: { bien: true, locataire: true, avenants: true },
    });
    if (!bail) throw new NotFoundException('Bail non trouvé');
    return bail;
  }

  async update(numeroBail: string, dto: UpdateBailDto) {
    const bail = await this.findOne(numeroBail);

    if (dto.locataireId && dto.locataireId !== bail.locataireId) {
      await this.verifierUniciteAvantage(dto.locataireId, numeroBail);
    }
    if (dto.montantLoyer !== undefined) {
      this.verifierClausesInterdites({ montantLoyer: dto.montantLoyer });
    }

    const updateData: any = {};
    if (dto.dateDebut) updateData.dateDebut = new Date(dto.dateDebut);
    if (dto.dateFin) updateData.dateFin = new Date(dto.dateFin);
    if (dto.montantLoyer !== undefined)
      updateData.montantLoyer = dto.montantLoyer;
    if (dto.statut) updateData.statut = dto.statut;
    if (dto.locataireId) {
      const loc = await this.prisma.occupant.findUnique({
        where: { occupanId: dto.locataireId },
      });
      if (!loc) throw new NotFoundException('Nouveau locataire non trouvé');
      updateData.locataireId = dto.locataireId;
    }

    if (dto.bienNumero && dto.bienNumero !== bail.bienNumero) {
      const meub = await this.prisma.bien.findUnique({
        where: { numeroBien: dto.bienNumero },
      });
      if (!meub) throw new NotFoundException('Nouveau bien non trouvé');
      if (meub.statut !== 'LIBRE') {
        throw new BadRequestException("Le nouveau bien n'est pas libre");
      }
      await this.prisma.bien.update({
        where: { numeroBien: bail.bienNumero },
        data: { statut: 'LIBRE' },
      });
      await this.prisma.bien.update({
        where: { numeroBien: dto.bienNumero },
        data: { statut: 'OCCUPE' },
      });
      updateData.bienNumero = dto.bienNumero;
    }

    return this.prisma.bail.update({
      where: { numeroBail },
      data: updateData,
      include: { bien: true, locataire: true },
    });
  }

  async remove(numeroBail: string) {
    const bail = await this.findOne(numeroBail);
    await this.prisma.avenant.deleteMany({ where: { bailNumero: numeroBail } });
    if (bail.bienNumero) {
      await this.prisma.bien.update({
        where: { numeroBien: bail.bienNumero },
        data: { statut: 'LIBRE' },
      });
    }
    return this.prisma.bail.delete({ where: { numeroBail } });
  }

  async getChecklist(numeroBail: string) {
    const bail = await this.findOne(numeroBail);
    let checklistState: any[] = [];
    try {
      if (bail.checklistData) {
        checklistState =
          typeof bail.checklistData === 'string'
            ? JSON.parse(bail.checklistData)
            : (bail.checklistData as any[]);
      }
    } catch {
      checklistState = [];
    }
    const today = new Date();

    return this.CHECKLIST_OBLIGATOIRE.map((item) => {
      const found = checklistState.find((c) => c.type === item.type);
      let valideIntelligente = found?.fourni || false;
      let motifInvalide: string | null = null;
      if (item.type === 'CISJ' && found?.dateEmission) {
        const dateEmi = new Date(found.dateEmission);
        const diffDays = Math.ceil(
          (today.getTime() - dateEmi.getTime()) / (1000 * 3600 * 24),
        );
        if (diffDays > 90) {
          valideIntelligente = false;
          motifInvalide = `Le CISJ date de plus de 3 mois (${diffDays} jours).`;
        }
      }
      return {
        ...item,
        fourni: found?.fourni || false,
        fichierUrl: found?.fichierUrl || null,
        commentaire: found?.commentaire || null,
        dateEmission: found?.dateEmission || null,
        valideIntelligente,
        motifInvalide,
      };
    });
  }

  async updateChecklist(numeroBail: string, dto: UpdateChecklistDto) {
    await this.findOne(numeroBail);
    return this.prisma.bail.update({
      where: { numeroBail },
      data: { checklistData: dto.items as any },
    });
  }

  async validerAccordMEF(numeroBail: string, dto: AccordMefDto) {
    await this.findOne(numeroBail);
    return this.prisma.bail.update({
      where: { numeroBail },
      data: {
        accordMef: true,
        refAccordMef: dto.refAccordMef,
        dateAccordMef: dto.dateAccordMef
          ? new Date(dto.dateAccordMef)
          : new Date(),
        statut: StatutBail.VISA_CF_SOUMIS,
      },
      include: { bien: true, locataire: true },
    });
  }

  async validerVisaCF(numeroBail: string, dto: VisaCfDto) {
    const bail = await this.findOne(numeroBail);
    if (!bail.accordMef) {
      throw new BadRequestException(
        "L'accord préalable du MEF est obligatoire avant le Visa CF.",
      );
    }
    return this.prisma.bail.update({
      where: { numeroBail },
      data: {
        visaCf: true,
        refVisaCf: dto.refVisaCf,
        dateVisaCf: dto.dateVisaCf ? new Date(dto.dateVisaCf) : new Date(),
        statut: StatutBail.VISA_CF_VALIDE,
      },
      include: { bien: true, locataire: true },
    });
  }

  /**
   * Validation Chef SRB
   * Bail → EN_COURS | Demande → VALIDEE
   * Le PDF se télécharge ensuite via GET .../contrat/pdf
   */
  async approuverSRB(numeroBail: string, _user: any) {
    const bail = await this.findOne(numeroBail);

    if (bail.approbationSrb || bail.statut === StatutBail.EN_COURS) {
      throw new BadRequestException('Ce bail est déjà approuvé / en cours');
    }

    if (
      bail.statut !== StatutBail.EN_ATTENTE_MEF &&
      bail.statut !== StatutBail.VISA_CF_SOUMIS &&
      bail.statut !== StatutBail.VISA_CF_VALIDE
    ) {
      throw new BadRequestException(
        'Seuls les baux en attente de validation peuvent être approuvés',
      );
    }

    if (!bail.bien || !bail.locataire) {
      throw new BadRequestException(
        'Bien ou locataire manquant : impossible de finaliser le bail (contrat)',
      );
    }

    const updated = await this.prisma.bail.update({
      where: { numeroBail },
      data: {
        approbationSrb: true,
        accordMef: true,
        visaCf: true,
        statut: StatutBail.EN_COURS,
      },
      include: { bien: true, locataire: true },
    });

    await this.syncDemandeStatut(
      bail.demandeReference,
      StatutDemande.VALIDEE,
    );

    return updated;
  }

  async validerEnregistrementFiscal(
    numeroBail: string,
    dto: EnregistrementFiscalDto,
  ) {
    const bail = await this.findOne(numeroBail);
    if (!bail.approbationSrb) {
      throw new BadRequestException(
        "L'approbation DPE/SRB doit précéder l'enregistrement fiscal.",
      );
    }
    return this.prisma.bail.update({
      where: { numeroBail },
      data: {
        enregistreFiscal: true,
        refEnregistrementFiscal: dto.refEnregistrementFiscal,
        dateEnregistrementFiscal: dto.dateEnregistrementFiscal
          ? new Date(dto.dateEnregistrementFiscal)
          : new Date(),
      },
      include: { bien: true, locataire: true },
    });
  }

  async terminerBail(numeroBail: string, _user: any) {
    const bail = await this.findOne(numeroBail);
    if (bail.statut !== StatutBail.EN_COURS) {
      throw new BadRequestException('Seul un bail en cours peut être terminé');
    }
    await this.prisma.bien.update({
      where: { numeroBien: bail.bienNumero },
      data: { statut: 'LIBRE' },
    });
    const updated = await this.prisma.bail.update({
      where: { numeroBail },
      data: { statut: StatutBail.TERMINE },
      include: { bien: true, locataire: true },
    });
    await this.syncDemandeStatut(
      bail.demandeReference,
      StatutDemande.TERMINEE,
    );
    return updated;
  }

  async renouveler(numeroBail: string, dto: RenouvellementDto, _user: any) {
    const ancienBail = await this.findOne(numeroBail);
    if (
      ancienBail.statut !== StatutBail.EN_COURS &&
      ancienBail.statut !== StatutBail.TERMINE
    ) {
      throw new BadRequestException(
        'Seuls les baux en cours ou terminés peuvent être renouvelés',
      );
    }
    await this.verifierUniciteAvantage(ancienBail.locataireId, numeroBail);

    const nouveauNumero = `BAIL-${uuidv4().slice(0, 8).toUpperCase()}`;
    const nouveauBail = await this.prisma.bail.create({
      data: {
        numeroBail: nouveauNumero,
        dateDebut: new Date(dto.nouvelleDateDebut),
        dateFin: new Date(dto.nouvelleDateFin),
        montantLoyer: dto.nouveauMontantLoyer || ancienBail.montantLoyer,
        nomBailleur: ancienBail.nomBailleur,
        nifBailleur: ancienBail.nifBailleur,
        statBailleur: ancienBail.statBailleur,
        ribBailleur: ancienBail.ribBailleur,
        bienNumero: ancienBail.bienNumero,
        locataireId: ancienBail.locataireId,
        accordMef: ancienBail.accordMef,
        refAccordMef: ancienBail.refAccordMef,
        statut: StatutBail.EN_COURS,
      },
      include: { bien: true, locataire: true },
    });

    await this.prisma.bail.update({
      where: { numeroBail },
      data: { statut: StatutBail.RENOUVELE },
    });

    return nouveauBail;
  }

  /** Génère le PDF avec toutes les variables (bail + bien + locataire + bailleur) */
  async generateContratPdf(numeroBail: string): Promise<Buffer> {
    const bail = await this.prisma.bail.findUnique({
      where: { numeroBail },
      include: { bien: true, locataire: true },
    });

    if (!bail) throw new NotFoundException('Bail non trouvé');
    if (!bail.bien || !bail.locataire) {
      throw new BadRequestException(
        'Données incomplètes : bien ou locataire manquant pour le contrat',
      );
    }

    this.verifierClausesInterdites({
      montantLoyer: bail.montantLoyer ?? undefined,
    });

    const docDefinition = getContratBailTemplate({
      numeroBail: bail.numeroBail,
      dateDebut: bail.dateDebut,
      dateFin: bail.dateFin,
      montantLoyer: bail.montantLoyer ?? undefined,
      bien: {
        numeroBien: bail.bien.numeroBien,
        nomDuBien: bail.bien.nomDuBien,
        adresse: bail.bien.adresse ?? '',
        localite: bail.bien.localite ?? undefined,
        typeBien: String(bail.bien.typeBien ?? ''),
      },
      locataire: {
        nom: bail.locataire.nom,
        prenom: bail.locataire.prenom,
        matricule: bail.locataire.matricule,
        cin: bail.locataire.cin ?? undefined,
        telephone: bail.locataire.telephone ?? undefined,
        ministere: bail.locataire.ministere ?? undefined,
        fonction: bail.locataire.fonction ?? undefined,
      },
      lieuSignature: 'Fianarantsoa',
      dateSignature: new Date(),
    });

    // pdfmake 0.3.x : getBuffer() retourne une Promise (plus de callback)
    const buffer: Buffer = await pdfMakeInstance
      .createPdf(docDefinition)
      .getBuffer();

    if (!buffer?.length) {
      throw new Error('Buffer PDF vide généré par pdfmake');
    }

    return buffer;
  }

  async createAvenant(numeroBail: string, dto: CreateAvenantDto, _user: any) {
    const bail = await this.findOne(numeroBail);
    if (bail.statut !== StatutBail.EN_COURS) {
      throw new BadRequestException(
        'On ne peut créer un avenant que sur un bail en cours',
      );
    }
    const numeroAvenant = `AV-${uuidv4().slice(0, 8).toUpperCase()}`;
    const avenant = await this.prisma.avenant.create({
      data: {
        numeroAvenant,
        typeAvenant: dto.typeAvenant,
        description: dto.description,
        ancienMontant: bail.montantLoyer,
        nouveauMontant: dto.nouveauMontant,
        ancienneDateFin: bail.dateFin,
        nouvelleDateFin: dto.nouvelleDateFin
          ? new Date(dto.nouvelleDateFin)
          : null,
        bailNumero: numeroBail,
      },
    });
    const dataToUpdate: any = {};
    if (dto.nouveauMontant !== undefined) {
      dataToUpdate.montantLoyer = dto.nouveauMontant;
    }
    if (dto.nouvelleDateFin) {
      dataToUpdate.dateFin = new Date(dto.nouvelleDateFin);
    }
    if (Object.keys(dataToUpdate).length > 0) {
      await this.prisma.bail.update({
        where: { numeroBail },
        data: dataToUpdate,
      });
    }
    return avenant;
  }

  async getAvenants(numeroBail: string) {
    await this.findOne(numeroBail);
    return this.prisma.avenant.findMany({
      where: { bailNumero: numeroBail },
      orderBy: { dateAvenant: 'desc' },
    });
  }

  async getAvenant(numeroBail: string, avenantId: string) {
    const avenant = await this.prisma.avenant.findFirst({
      where: { id: avenantId, bailNumero: numeroBail },
    });
    if (!avenant) throw new NotFoundException('Avenant non trouvé');
    return avenant;
  }

  async deleteAvenant(numeroBail: string, avenantId: string) {
    await this.getAvenant(numeroBail, avenantId);
    return this.prisma.avenant.delete({ where: { id: avenantId } });
  }

  async generateAvenantPdf(
    numeroBail: string,
    avenantId: string,
  ): Promise<Buffer> {
    const avenant = await this.prisma.avenant.findFirst({
      where: { id: avenantId, bailNumero: numeroBail },
      include: {
        bail: { include: { bien: true, locataire: true } },
      },
    });
    if (!avenant) throw new NotFoundException('Avenant non trouvé');
    const bail = avenant.bail;

    const docDefinition = getAvenantTemplate({
      numeroAvenant: avenant.numeroAvenant,
      numeroBail: bail.numeroBail,
      dateAvenant: avenant.dateAvenant,
      typeAvenant: avenant.typeAvenant,
      description: avenant.description ?? undefined,
      bien: {
        numeroBien: bail.bien.numeroBien,
        nomDuBien: bail.bien.nomDuBien,
        adresse: bail.bien.adresse,
        localite: bail.bien.localite ?? undefined,
      },
      locataire: {
        nom: bail.locataire.nom,
        prenom: bail.locataire.prenom,
        matricule: bail.locataire.matricule,
        cin: bail.locataire.cin ?? undefined,
        ministere: bail.locataire.ministere ?? undefined,
        fonction: bail.locataire.fonction ?? undefined,
      },
      ancienMontant: avenant.ancienMontant ?? undefined,
      nouveauMontant: avenant.nouveauMontant ?? undefined,
      ancienneDateFin: avenant.ancienneDateFin ?? undefined,
      nouvelleDateFin: avenant.nouvelleDateFin ?? undefined,
      lieuSignature: 'Fianarantsoa',
    });

    // pdfmake 0.3.x : getBuffer() retourne une Promise (plus de callback)
    const buffer: Buffer = await pdfMakeInstance
      .createPdf(docDefinition)
      .getBuffer();

    if (!buffer?.length) {
      throw new Error('Buffer PDF vide généré par pdfmake');
    }

    return buffer;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredBauxCron() {
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 3600 * 1000);
    const bauxExpires = await this.prisma.bail.findMany({
      where: {
        statut: StatutBail.EN_COURS,
        dateFin: { lt: ninetyDaysAgo },
      },
    });
    for (const bail of bauxExpires) {
      await this.prisma.bail.update({
        where: { numeroBail: bail.numeroBail },
        data: { statut: StatutBail.RESILIE },
      });
      if (bail.bienNumero) {
        await this.prisma.bien.update({
          where: { numeroBien: bail.bienNumero },
          data: { statut: 'LIBRE' },
        });
      }
    }
  }
}