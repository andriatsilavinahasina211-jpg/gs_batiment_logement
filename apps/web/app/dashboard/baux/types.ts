export type StatutBail =
  | "EN_ATTENTE_MEF"
  | "VISA_CF_SOUMIS"
  | "VISA_CF_VALIDE"
  | "EN_COURS"
  | "TERMINE"
  | "RENOUVELE"
  | "RESILIE";

/** Vue front alignée sur le modèle Prisma Bail (+ champs dénormalisés pour l'affichage) */
export interface Bail {
  numeroBail: string;
  dateDebut: string;
  dateFin: string;
  montantLoyer?: number;
  statut: StatutBail;

  // Circuit réglementaire
  accordMef?: boolean;
  refAccordMef?: string;
  dateAccordMef?: string;
  visaCf: boolean;
  refVisaCf?: string;
  dateVisaCf?: string;
  approbationSrb: boolean;
  enregistreFiscal: boolean;
  refEnregistrementFiscal?: string;
  dateEnregistrementFiscal?: string;

  // Bailleur
  nomBailleur?: string;
  nifBailleur?: string;
  statBailleur?: string;
  ribBailleur?: string;

  // Relations (dénormalisées pour l'UI)
  bienNumero: string;
  bienNom?: string;
  locataireId?: number;
  locataireNom?: string;
  demandeReference?: string;
  contratPdfUrl?: string;
}