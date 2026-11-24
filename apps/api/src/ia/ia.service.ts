import { Injectable, Logger } from '@nestjs/common';
import { TypeNotification } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * BF-TRAV-04 / 4.8 : Rapport d'analyse complet de l'assistance décision IA
   * + génération automatique de notifications critiques
   */
  async getAnalyseComplete() {
    const [
      retardsTravaux,
      travauxSansQuitus,
      occupantsSansTitre,
      biensSansQuitusRecent,
      alertesDelaisOccupation,
      doublonsAvantageLogement,
      biensSurcharges,
    ] = await Promise.all([
      this.detecterRetardsTravaux(),
      this.detecterTravauxSansQuitusN1(),
      this.detecterOccupantsSansTitre(),
      this.detecterBiensSansReview(),
      this.detecterAlertesDelaisOccupation(),
      this.detecterDoublonsAvantageLogement(),
      this.detecterBiensChantiersMultiples(),
    ]);

    // Génération des notifications (non bloquant)
    this.genererNotificationsCritiques({
      retardsTravaux,
      travauxSansQuitus,
      occupantsSansTitre,
      doublonsAvantageLogement,
      alertesDelaisOccupation,
    }).catch((error: unknown) => {
      this.logger.warn(
        `Échec de génération des notifications IA : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

    return {
      generatedAt: new Date().toISOString(),
      resume: {
        totalAlertes:
          retardsTravaux.length +
          travauxSansQuitus.length +
          occupantsSansTitre.length +
          alertesDelaisOccupation.length +
          doublonsAvantageLogement.length,
        niveauRisqueGlobal: this.calculerNiveauRisque(
          retardsTravaux.length +
            travauxSansQuitus.length +
            doublonsAvantageLogement.length +
            occupantsSansTitre.length,
        ),
      },
      anomalies: {
        retardsTravaux,
        travauxSansQuitus,
        occupantsSansTitre,
        doublonsAvantageLogement,
        biensSurcharges,
      },
      alertes: {
        delaisOccupation: alertesDelaisOccupation,
        biensSansQuitusRecent,
      },
      suggestions: this.genererSuggestions({
        nbRetardsTravaux: retardsTravaux.length,
        nbSansQuitus: travauxSansQuitus.length,
        nbSansTitre: occupantsSansTitre.length,
        nbDoublons: doublonsAvantageLogement.length,
      }),
    };
  }

  // ==================== NOTIFICATIONS ====================

  private async genererNotificationsCritiques(data: {
    retardsTravaux: {
      reference: string;
      joursRetard: number;
      message: string;
      lien: string;
    }[];
    travauxSansQuitus: {
      reference: string;
      message: string;
      lien: string;
    }[];
    occupantsSansTitre: {
      numeroOccupation: string;
      message: string;
      lien: string;
    }[];
    doublonsAvantageLogement: {
      occupationRef: string;
      bailRef: string;
      message: string;
    }[];
    alertesDelaisOccupation: {
      gravite: 'CRITIQUE' | 'HAUTE';
      numeroOccupation: string;
      message: string;
      lien: string;
    }[];
  }) {
    const items: Parameters<NotificationService['createIfNotExists']>[0][] = [];

    // 1. Doublons avantage logement (le plus critique)
    data.doublonsAvantageLogement.forEach((d) => {
      items.push({
        titre: 'Violation unicité avantage logement',
        message: d.message,
        type: TypeNotification.ANOMALIE,
        cleUnique: `ia-doublon-${d.occupationRef}-${d.bailRef}`,
        rolesCibles: ['CHEF_SRB', 'ADMINISTRATEUR'],
      });
    });

    // 2. Occupants sans titre
    data.occupantsSansTitre.forEach((o) => {
      items.push({
        titre: 'Occupation sans titre légal',
        message: o.message,
        type: TypeNotification.ANOMALIE,
        lien: o.lien,
        cleUnique: `ia-sans-titre-${o.numeroOccupation}`,
        rolesCibles: ['CHEF_SRB', 'ADMINISTRATEUR'],
      });
    });

    // 3. Travaux sans Quitus N-1
    data.travauxSansQuitus.forEach((t) => {
      items.push({
        titre: 'Travaux sans Quitus N-1 (Circulaire 813)',
        message: t.message,
        type: TypeNotification.ANOMALIE,
        lien: t.lien,
        cleUnique: `ia-sans-quitus-${t.reference}`,
        rolesCibles: ['CHEF_SRB', 'ADMINISTRATEUR'],
      });
    });

    // 4. Délais d’occupation dépassés
    data.alertesDelaisOccupation
      .filter((a) => a.gravite === 'CRITIQUE')
      .forEach((a) => {
        items.push({
          titre: 'Délai de jouissance dépassé',
          message: a.message,
          type: TypeNotification.ALERTE_DELAI,
          lien: a.lien,
          cleUnique: `ia-delai-depasse-${a.numeroOccupation}`,
          rolesCibles: ['CHEF_SRB', 'ADMINISTRATEUR', 'AGENT'],
        });
      });

    // 5. Retards travaux (HAUTE)
    data.retardsTravaux.forEach((t) => {
      items.push({
        titre: `Travaux en retard (${t.joursRetard} j)`,
        message: t.message,
        type: TypeNotification.RETARD_TRAVAUX,
        lien: t.lien,
        cleUnique: `ia-retard-${t.reference}`,
        rolesCibles: ['CHEF_SRB', 'ADMINISTRATEUR', 'AGENT'],
      });
    });

    // Création (évite les doublons grâce à cleUnique)
    for (const item of items) {
      try {
        await this.notificationService.createIfNotExists(item);
      } catch (error) {
        this.logger.warn(
          `Échec de création d'une notification IA (${item.cleUnique}) : ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  // ==================== DÉTECTIONS ====================

  private async detecterRetardsTravaux() {
    const now = new Date();
    const travaux = await this.prisma.travaux.findMany({
      where: {
        dateFinPrevue: { lt: now },
        statut: { notIn: ['TERMINE', 'ANNULE'] },
      },
      include: {
        bien: { select: { nomDuBien: true, adresse: true } },
        createdBy: { select: { nom: true, prenom: true } },
      },
    });

    return travaux.map((t) => ({
      type: 'RETARD_TRAVAUX' as const,
      gravite: 'HAUTE' as const,
      reference: t.reference,
      bienNumero: t.bienNumero,
      bienNom: t.bien.nomDuBien,
      message: `Les travaux "${t.reference}" sur le bien "${t.bien.nomDuBien}" ont dépassé leur date de fin prévue (${new Date(t.dateFinPrevue).toLocaleDateString('fr-FR')}). Avancement actuel : ${t.avancementPourcent}%.`,
      joursRetard: Math.floor(
        (now.getTime() - t.dateFinPrevue.getTime()) / (1000 * 60 * 60 * 24),
      ),
      lien: `/travaux/${t.id}`,
    }));
  }

  private async detecterTravauxSansQuitusN1() {
    const travaux = await this.prisma.travaux.findMany({
      where: { quitusN1Present: false, statut: { not: 'ANNULE' } },
      include: { bien: { select: { nomDuBien: true } } },
    });

    return travaux.map((t) => ({
      type: 'TRAVAUX_SANS_QUITUS_N1' as const,
      gravite: 'CRITIQUE' as const,
      reference: t.reference,
      bienNumero: t.bienNumero,
      bienNom: t.bien.nomDuBien,
      message: `ANOMALIE RÉGLEMENTAIRE : Les travaux "${t.reference}" ont été initiés sans Quitus de recensement N-1. Non conforme à la Circulaire N°813-MFB/SG/DGB/DPE/SLA du 20 décembre 2010.`,
      lien: `/travaux/${t.id}`,
    }));
  }

  private async detecterOccupantsSansTitre() {
    const occupations = await this.prisma.occupation.findMany({
      where: { statut: 'SANS_TITRE' },
      include: {
        bien: { select: { nomDuBien: true, adresse: true } },
        occupant: { select: { nom: true, prenom: true, matricule: true } },
      },
    });

    return occupations.map((o) => ({
      type: 'OCCUPANT_SANS_TITRE' as const,
      gravite: 'CRITIQUE' as const,
      numeroOccupation: o.numeroOccupation,
      bienNumero: o.bienNumero,
      bienNom: o.bien.nomDuBien,
      occupant: o.occupant
        ? `${o.occupant.nom} ${o.occupant.prenom} (${o.occupant.matricule})`
        : 'Inconnu',
      message: `Occupation sans titre légal détectée sur le bien "${o.bien.nomDuBien}". Une procédure de libération ou judiciaire doit être initiée.`,
      lien: `/occupations/${o.numeroOccupation}`,
    }));
  }

  private async detecterBiensSansReview() {
    const anneeActuelle = new Date().getFullYear();
    const biens = await this.prisma.bien.findMany({
      select: { numeroBien: true, nomDuBien: true, statut: true },
    });
    const quitusAnneeActuelle = await this.prisma.quitus.findMany({
      where: { annee: anneeActuelle },
      select: { bienNumero: true },
    });
    const biensAvecQuitus = new Set(quitusAnneeActuelle.map((q) => q.bienNumero));

    return biens
      .filter((b) => !biensAvecQuitus.has(b.numeroBien))
      .map((b) => ({
        bienNumero: b.numeroBien,
        nomDuBien: b.nomDuBien,
        message: `Le bien "${b.nomDuBien}" n'a pas encore de quitus pour l'année ${anneeActuelle}.`,
        lien: `/biens/${b.numeroBien}`,
      }));
  }

  private async detecterAlertesDelaisOccupation() {
    const now = new Date();
    const dans7Jours = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const occupations = await this.prisma.occupation.findMany({
      where: {
        dateSortiePrevue: { lte: dans7Jours },
        statut: { in: ['EN_COURS', 'FIN_PROCHE', 'APPROUVE'] },
      },
      include: {
        bien: { select: { nomDuBien: true, typeBien: true } },
        occupant: { select: { nom: true, prenom: true, matricule: true } },
      },
    });

    return occupations.map((o) => {
      const joursRestants = o.dateSortiePrevue
        ? Math.floor(
            (o.dateSortiePrevue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          )
        : 0;

      return {
        type: (joursRestants < 0 ? 'DELAI_DEPASSE' : 'DELAI_PROCHE') as
          | 'DELAI_DEPASSE'
          | 'DELAI_PROCHE',
        gravite: (joursRestants < 0 ? 'CRITIQUE' : 'HAUTE') as 'CRITIQUE' | 'HAUTE',
        numeroOccupation: o.numeroOccupation,
        bienNom: o.bien.nomDuBien,
        occupant: o.occupant
          ? `${o.occupant.nom} ${o.occupant.prenom}`
          : 'Inconnu',
        dateSortiePrevue: o.dateSortiePrevue,
        joursRestants,
        message:
          joursRestants < 0
            ? `Délai de jouissance dépassé de ${Math.abs(joursRestants)} jours pour le bien "${o.bien.nomDuBien}".`
            : `Délai de jouissance expire dans ${joursRestants} jour(s) pour le bien "${o.bien.nomDuBien}".`,
        lien: `/occupations/${o.numeroOccupation}`,
      };
    });
  }

  private async detecterDoublonsAvantageLogement() {
    const occupants = await this.prisma.occupant.findMany({
      select: { occupanId: true, nom: true, prenom: true, matricule: true },
    });

    const doublons: {
      type: 'DOUBLON_AVANTAGE_LOGEMENT';
      gravite: 'CRITIQUE';
      occupant: string;
      occupationRef: string;
      bailRef: string;
      message: string;
    }[] = [];

    for (const occupant of occupants) {
      const [occupationActive, bailActif] = await Promise.all([
        this.prisma.occupation.findFirst({
          where: {
            occupantId: occupant.occupanId,
            statut: { in: ['EN_COURS', 'APPROUVE'] },
          },
        }),
        this.prisma.bail.findFirst({
          where: {
            locataireId: occupant.occupanId,
            statut: { in: ['EN_COURS', 'VISA_CF_VALIDE'] },
          },
        }),
      ]);

      if (occupationActive && bailActif) {
        doublons.push({
          type: 'DOUBLON_AVANTAGE_LOGEMENT' as const,
          gravite: 'CRITIQUE' as const,
          occupant: `${occupant.nom} ${occupant.prenom} (${occupant.matricule})`,
          occupationRef: occupationActive.numeroOccupation,
          bailRef: bailActif.numeroBail,
          message: `VIOLATION RÉGLEMENTAIRE : L'occupant ${occupant.nom} ${occupant.prenom} bénéficie simultanément d'un logement de fonction ET d'un bail actif (unicité d'avantage logement).`,
        });
      }
    }

    return doublons;
  }

  private async detecterBiensChantiersMultiples() {
    const travaux = await this.prisma.travaux.groupBy({
      by: ['bienNumero'],
      where: { statut: { in: ['EN_COURS', 'EN_ATTENTE'] } },
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    });

    if (travaux.length === 0) return [];

    const bienIds = travaux.map((t) => t.bienNumero);
    const biens = await this.prisma.bien.findMany({
      where: { numeroBien: { in: bienIds } },
      select: { numeroBien: true, nomDuBien: true },
    });

    return biens.map((b) => {
      const count =
        travaux.find((t) => t.bienNumero === b.numeroBien)?._count.id ?? 0;
      return {
        type: 'CHANTIERS_MULTIPLES' as const,
        gravite: 'MOYENNE' as const,
        bienNumero: b.numeroBien,
        bienNom: b.nomDuBien,
        nbChantiers: count,
        message: `Anomalie : ${count} chantiers actifs simultanément sur le bien "${b.nomDuBien}".`,
        lien: `/biens/${b.numeroBien}`,
      };
    });
  }

  private calculerNiveauRisque(nbAlertesCritiques: number): string {
    if (nbAlertesCritiques === 0) return 'FAIBLE';
    if (nbAlertesCritiques <= 2) return 'MOYEN';
    if (nbAlertesCritiques <= 5) return 'ELEVÉ';
    return 'CRITIQUE';
  }

  private genererSuggestions(stats: {
    nbRetardsTravaux: number;
    nbSansQuitus: number;
    nbSansTitre: number;
    nbDoublons: number;
  }): string[] {
    const suggestions: string[] = [];

    if (stats.nbDoublons > 0) {
      suggestions.push(
        `⚠️ URGENT : ${stats.nbDoublons} doublon(s) d'avantage logement détecté(s). Régulariser immédiatement (violation principe d'unicité).`,
      );
    }
    if (stats.nbSansTitre > 0) {
      suggestions.push(
        `⚠️ URGENT : ${stats.nbSansTitre} occupation(s) sans titre légal. Initier les procédures de libération ou judiciaires.`,
      );
    }
    if (stats.nbSansQuitus > 0) {
      suggestions.push(
        `📋 ${stats.nbSansQuitus} chantier(s) sans Quitus N-1. Vérifier la conformité réglementaire (Circulaire N°813) avant poursuite des travaux.`,
      );
    }
    if (stats.nbRetardsTravaux > 0) {
      suggestions.push(
        `🔧 ${stats.nbRetardsTravaux} chantier(s) en retard. Planifier des contrôles terrain et réviser les délais.`,
      );
    }
    if (suggestions.length === 0) {
      suggestions.push('✅ Aucune anomalie critique détectée. La situation est conforme.');
    }

    return suggestions;
  }

  /**
   * Indicateurs synthétiques pour le dashboard (tous rôles)
   */
  async getIndicateursDashboard() {
    const now = new Date();
    const dans30Jours = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      travauxEnRetard,
      travauxSansQuitus,
      occupantsSansTitre,
      occupationsFin30j,
      totalBiens,
      bienLibres,
      bienOccupes,
    ] = await Promise.all([
      this.prisma.travaux.count({
        where: {
          dateFinPrevue: { lt: now },
          statut: { notIn: ['TERMINE', 'ANNULE'] },
        },
      }),
      this.prisma.travaux.count({
        where: { quitusN1Present: false, statut: { not: 'ANNULE' } },
      }),
      this.prisma.occupation.count({ where: { statut: 'SANS_TITRE' } }),
      this.prisma.occupation.count({
        where: {
          dateSortiePrevue: { lte: dans30Jours, gte: now },
          statut: { in: ['EN_COURS', 'APPROUVE'] },
        },
      }),
      this.prisma.bien.count(),
      this.prisma.bien.count({ where: { statut: 'LIBRE' } }),
      this.prisma.bien.count({ where: { statut: 'OCCUPE' } }),
    ]);

    return {
      travauxEnRetard,
      travauxSansQuitus,
      occupantsSansTitre,
      occupationsFin30j,
      biens: {
        total: totalBiens,
        libres: bienLibres,
        occupes: bienOccupes,
      },
      niveauRisque: this.calculerNiveauRisque(
        travauxSansQuitus + occupantsSansTitre,
      ),
    };
  }

  /**
   * Recommandation IA Décisionnelle pour une Demande spécifique
   * Analyse réglementaire en temps réel pour éclairer la décision du Chef SRB
   */
  async evaluerDemandeDecision(reference: string) {
    const demande = await this.prisma.demande.findUnique({
      where: { reference },
      include: {
        demandeur: true,
        bien: true,
        piecesJointes: true,
        validations: true,
      },
    });

    if (!demande) {
      return {
        avis: 'NEUTRE',
        confiance: 0,
        synthese: 'Demande non trouvée',
        pointsPositifs: [],
        alertes: ['Référence de demande inexistante.'],
        recommandation: 'Vérifier la référence du dossier.',
      };
    }

    const alertes: string[] = [];
    const pointsPositifs: string[] = [];
    let score = 100;

    // 1. RÈGLE D'UNICITÉ D'AVANTAGE LOGEMENT (Section 6.5.3.5)
    if (demande.typeDemande === 'OCCUPATION' || demande.typeDemande === 'BAIL') {
      const occupationsExistantes = await this.prisma.occupation.findMany({
        where: {
          occupantId: demande.demandeurId,
          statut: { in: ['EN_COURS', 'APPROUVE'] },
        },
        include: { bien: true },
      });

      const bauxExistants = await this.prisma.bail.findMany({
        where: {
          locataireId: demande.demandeurId,
          statut: 'EN_COURS',
        },
      });

      if (occupationsExistantes.length > 0) {
        alertes.push(
          `Violation Unicité d'Avantage : Le demandeur occupe déjà le bien ${occupationsExistantes[0].bienNumero} (${occupationsExistantes[0].bien?.nomDuBien || ''}).`,
        );
        score -= 50;
      } else if (bauxExistants.length > 0) {
        alertes.push(
          `Violation Unicité d'Avantage : Le demandeur bénéficie déjà d'un bail actif (#${bauxExistants[0].numeroBail}).`,
        );
        score -= 50;
      } else {
        pointsPositifs.push('Respect du principe d’unicité : Aucun autre logement administratif ni bail actif détecté.');
      }
    }

    // 2. DISPONIBILITÉ DU BIEN DEMANDÉ
    if (demande.bienNumero && demande.typeDemande === 'OCCUPATION') {
      if (demande.bien?.statut === 'OCCUPE') {
        alertes.push(
          `Indisponibilité : Le bien demandé (${demande.bien.nomDuBien || demande.bienNumero}) est actuellement marqué comme DÉJÀ OCCUPÉ.`,
        );
        score -= 40;
      } else {
        pointsPositifs.push(`Bien disponible : Le bien ${demande.bien?.nomDuBien || demande.bienNumero} est libre d'affectation.`);
      }
    }

    // 3. TRAVAUX ET CONFORMITÉ CIRCULAIRE N°813 (Quitus N-1)
    if (demande.typeDemande === 'TRAVAUX') {
      const anneePrecedente = new Date().getFullYear() - 1;
      const quitusN1 = demande.bienNumero
        ? await this.prisma.quitus.findFirst({
            where: {
              bienNumero: demande.bienNumero,
              annee: anneePrecedente,
              statut: 'VALIDE',
            },
          })
        : null;

      if (!quitusN1) {
        alertes.push(
          `Alerte Circulaire N°813 : Aucun Quitus de recensement trouvé pour l'année ${anneePrecedente} sur ce bien. Risque de rejet par le Contrôle Financier.`,
        );
        score -= 30;
      } else {
        pointsPositifs.push(`Conformité Circulaire N°813 : Quitus ${anneePrecedente} présent et régulier.`);
      }
    }

    // 4. ATTESTATION DE NON-LOGEMENT (Annexe 39 & Visa Supérieur)
    if (demande.typeDemande === 'ATTESTATION') {
      pointsPositifs.push('Demande d’attestation : Vérifier la déclaration légalisée auprès du Firaisana (Annexe 39).');
    }

    // 5. SYNTHÈSE & RECOMMANDATION FINALE
    let avis: 'FAVORABLE' | 'RESERVE' | 'DEFAVORABLE' = 'FAVORABLE';
    let recommandation = 'Dossier réglementairement recevable. Validation recommandée.';

    if (score < 50) {
      avis = 'DEFAVORABLE';
      recommandation = 'Risque de non-conformité élevé. Refus ou demande de régularisation fortement conseillé.';
    } else if (score < 80) {
      avis = 'RESERVE';
      recommandation = 'Dossier recevable avec réserves. Une vérification préalable des pièces justificatives est conseillée.';
    }

    return {
      reference,
      typeDemande: demande.typeDemande,
      score: Math.max(10, score),
      avis,
      recommandation,
      pointsPositifs,
      alertes,
      demandeur: demande.demandeur
        ? `${demande.demandeur.prenom} ${demande.demandeur.nom} (${demande.demandeur.matricule || 'N/A'})`
        : 'Demandeur non renseigné',
    };
  }
}