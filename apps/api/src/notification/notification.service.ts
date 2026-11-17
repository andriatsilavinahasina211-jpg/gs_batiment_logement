import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Notification, TypeNotification } from '@prisma/client';
import { Observable, Subject, filter, map } from 'rxjs';

@Injectable()
export class NotificationService {
  private readonly notificationEvents = new Subject<{
    userId: number;
    notification: Notification;
  }>();

  constructor(private prisma: PrismaService) {}

  streamForUser(userId: number): Observable<{ data: Notification }> {
    return this.notificationEvents.pipe(
      filter((event) => event.userId === userId),
      map((event) => ({ data: event.notification })),
    );
  }

  publishCreated(notification: Notification) {
    this.notificationEvents.next({ userId: notification.userId, notification });
  }

  /**
   * Crée une notification pour un utilisateur.
   */
  async creerNotification(params: {
    userId: number;
    titre: string;
    message: string;
    type: TypeNotification;
    lien?: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        titre: params.titre,
        message: params.message,
        type: params.type,
        lien: params.lien,
      },
    });
    this.publishCreated(notification);
    return notification;
  }

  /**
   * Crée une notification UNIQUEMENT si elle n'existe pas déjà
   * (détection par ressource et type, ou titre, message et type sans lien).
   * Méthode utilisée par le module IA.
   */
  async createIfNotExists(params: {
    titre: string;
    message: string;
    type: TypeNotification;
    lien?: string;
    cleUnique?: string; // gardé pour compatibilité d'appel, non utilisé en base
    rolesCibles: ('AGENT' | 'CHEF_SRB' | 'ADMINISTRATEUR')[];
  }) {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: params.rolesCibles },
        isActive: true,
      },
      select: { id: true },
    });

    if (users.length === 0) {
      return null;
    }

    const results: Awaited<ReturnType<typeof this.prisma.notification.findFirst>>[] = [];

    for (const u of users) {
      const where = params.lien
        ? { userId: u.id, type: params.type, lien: params.lien }
        : {
            userId: u.id,
            type: params.type,
            titre: params.titre,
            message: params.message,
          };
      const existing = await this.prisma.notification.findFirst({
        where,
      });

      if (existing) {
        results.push(existing);
        continue;
      }

      const created = await this.creerNotification({
        userId: u.id,
        titre: params.titre,
        message: params.message,
        type: params.type,
        lien: params.lien,
      });
      results.push(created);
    }

    return results[0] ?? null;
  }

  /**
   * Crée une notification pour tous les utilisateurs d'un ou plusieurs rôles.
   */
  async notifierParRole(
    roles: ('AGENT' | 'CHEF_SRB' | 'ADMINISTRATEUR')[],
    params: {
      titre: string;
      message: string;
      type: TypeNotification;
      lien?: string;
      cleUnique?: string;
    },
  ) {
    // Si une cleUnique est fournie, on utilise createIfNotExists (anti-doublon)
    if (params.cleUnique) {
      return this.createIfNotExists({
        ...params,
        rolesCibles: roles,
      });
    }

    const users = await this.prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true },
    });

    const notifications = users.map((u) =>
      this.creerNotification({
        userId: u.id,
        titre: params.titre,
        message: params.message,
        type: params.type,
        lien: params.lien,
      }),
    );

    return Promise.all(notifications);
  }

  async findMesNotifications(userId: number, nonLuesSeulement = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(nonLuesSeulement ? { lu: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async marquerCommeLue(id: string, userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { lu: true },
    });
    if (result.count === 0) {
      throw new NotFoundException('Notification introuvable');
    }
    return { success: true };
  }

  async marquerCommeNonLue(id: string, userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { lu: false },
    });
    if (result.count === 0) {
      throw new NotFoundException('Notification introuvable');
    }
    return { success: true };
  }

  async marquerToutesLues(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, lu: false },
      data: { lu: true },
    });
  }

  async countNonLues(userId: number) {
    return this.prisma.notification.count({
      where: { userId, lu: false },
    });
  }

  async supprimerNotification(id: string, userId: number) {
    const result = await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Notification introuvable');
    }
    return { success: true };
  }

  /**
   * Analyse automatique de la base de données pour détecter les échéances,
   * retards de chantiers et demandes en attente, puis génère les alertes pour l'utilisateur.
   */
  async genererAlertesAutomatiques(userId: number) {
    const now = new Date();
    const alertesCreees: any[] = [];

    // 1. Échéances des baux (< 45 jours ou expirés)
    try {
      const dans45Jours = new Date();
      dans45Jours.setDate(now.getDate() + 45);

      const bauxProches = await this.prisma.bail.findMany({
        where: {
          statut: 'EN_COURS',
          dateFin: { lte: dans45Jours },
        },
        take: 5,
      });

      for (const b of bauxProches) {
        const titre = `Échéance de bail : ${b.numeroBail}`;
        const existe = await this.prisma.notification.findFirst({
          where: { userId, titre },
        });

        if (!existe) {
          const joursRestants = Math.ceil(
            (new Date(b.dateFin).getTime() - now.getTime()) / (1000 * 3600 * 24),
          );
          const notif = await this.creerNotification({
            userId,
            titre,
            message:
              joursRestants <= 0
                ? `Le contrat de bail ${b.numeroBail} est arrivé à expiration.`
                : `Le bail ${b.numeroBail} arrive à terme dans ${joursRestants} jour(s). Prévoyez son renouvellement ou la libération.`,
            type: TypeNotification.ALERTE_DELAI,
            lien: 'bail',
          });
          alertesCreees.push(notif);
        }
      }
    } catch (e) {
      // Ignorer si table bail vide
    }

    // 2. Chantiers de travaux en retard
    try {
      const travauxEnRetard = await this.prisma.travaux.findMany({
        where: {
          statut: { in: ['EN_COURS', 'EN_ATTENTE'] },
          dateFinPrevue: { lte: now },
        },
        take: 5,
      });

      for (const t of travauxEnRetard) {
        const titre = `Retard constaté sur le chantier : ${t.reference}`;
        const existe = await this.prisma.notification.findFirst({
          where: { userId, titre },
        });

        if (!existe) {
          const notif = await this.creerNotification({
            userId,
            titre,
            message: `Le chantier ${t.reference} a dépassé sa date prévisionnelle de fin sans être clôturé.`,
            type: TypeNotification.RETARD_TRAVAUX,
            lien: 'travaux',
          });
          alertesCreees.push(notif);
        }
      }
    } catch (e) {
      // Ignorer si table travaux vide
    }

    // 3. Demandes en attente d'instruction
    try {
      const demandesEnAttente = await this.prisma.demande.findMany({
        where: { statut: 'EN_ATTENTE' },
        take: 5,
      });

      for (const d of demandesEnAttente) {
        const titre = `Demande en attente de traitement : ${d.reference}`;
        const existe = await this.prisma.notification.findFirst({
          where: { userId, titre },
        });

        if (!existe) {
          const notif = await this.creerNotification({
            userId,
            titre,
            message: `La demande de type ${d.typeDemande} réf. ${d.reference} nécessite une validation administrative.`,
            type: TypeNotification.VALIDATION,
            lien: 'demandes',
          });
          alertesCreees.push(notif);
        }
      }
    } catch (e) {
      // Ignorer si table demande vide
    }

    // 4. Campagne de recensement en cours
    try {
      const campagneOuverte = await this.prisma.campagneRecensement.findFirst({
        where: { statut: 'OUVERTE' },
      });

      if (campagneOuverte) {
        const titre = `Campagne de recensement ${campagneOuverte.annee} en cours`;
        const existe = await this.prisma.notification.findFirst({
          where: { userId, titre },
        });

        if (!existe) {
          const notif = await this.creerNotification({
            userId,
            titre,
            message: `La campagne annuelle de recensement des biens de l'État ${campagneOuverte.annee} est active. Veillez à soumettre les quitus avant la date limite.`,
            type: TypeNotification.RECENSEMENT,
            lien: 'recensement',
          });
          alertesCreees.push(notif);
        }
      }
    } catch (e) {
      // Ignorer si table campagne vide
    }

    // 5. Si aucune notification n'existe pour cet utilisateur, ajouter les alertes système d'accueil
    const total = await this.prisma.notification.count({ where: { userId } });
    if (total === 0) {
      const init1 = await this.creerNotification({
        userId,
        titre: 'Bienvenue sur le portail SIGLBAHM',
        message:
          'Votre système de gestion des bâtiments et logements administratifs est opérationnel.',
        type: TypeNotification.SYSTEME,
        lien: 'dashboard',
      });
      const init2 = await this.creerNotification({
        userId,
        titre: 'Rappel de conformité réglementaire',
        message:
          "Tout acte d’attribution ou convention de bail requiert le quitus de recensement conforme à la circulaire N°813.",
        type: TypeNotification.ANOMALIE,
        lien: 'recensement',
      });
      alertesCreees.push(init1, init2);
    }

    return {
      message: `${alertesCreees.length} nouvelle(s) alerte(s) générée(s)`,
      alertes: alertesCreees,
    };
  }
}