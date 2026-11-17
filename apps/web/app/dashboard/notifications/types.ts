export type TypeNotification =
  | "ALERTE_DELAI"
  | "VALIDATION"
  | "RETARD_TRAVAUX"
  | "RECENSEMENT"
  | "ANOMALIE"
  | "SYSTEME";

export interface NotificationItem {
  id: string;
  titre: string;
  message: string;
  type: TypeNotification;
  lu: boolean;
  lien?: string | null;
  userId: number;
  createdAt: string;
}

export interface NotificationStats {
  total: number;
  nonLues: number;
  alertesDelai: number;
  validations: number;
  retards: number;
}

