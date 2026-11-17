export type TypeTravaux =
  | "ENTRETIEN"
  | "REHABILITATION"
  | "AMENAGEMENT"
  | "CONSTRUCTION_NOUVELLE";

export type StatutTravaux =
  | "EN_ATTENTE"
  | "EN_COURS"
  | "TERMINE"
  | "SUSPENDU"
  | "ANNULE";

export interface HistoriqueItem {
  id: string;
  action: string;
  ancienValeur?: string | null;
  nouvelleValeur?: string | null;
  commentaire?: string | null;
  createdAt: string;
  user?: {
    nom: string;
    prenom: string;
    matricule?: string | null;
  };
}

export interface Travaux {
  id: string;
  reference: string;
  typeTravaux: TypeTravaux;
  dateDebutPrevue: string;
  dateFinPrevue: string;
  dateDebutReelle?: string | null;
  dateFinReelle?: string | null;
  montantEstimatif?: number | null;
  montantReel?: number | null;
  statut: StatutTravaux;
  avancementPourcent: number;
  referenceDevis?: string | null;
  observations?: string | null;
  quitusN1Present: boolean;
  autorisationDpe: boolean;
  bienNumero: string;
  bienNom?: string;
  bien?: {
    nomDuBien?: string;
    adresse?: string;
    typeBien?: string;
  } | null;
  createdBy?: {
    nom: string;
    prenom: string;
    matricule?: string | null;
  } | null;
  enRetard?: boolean;
  historique?: HistoriqueItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTravauxPayload {
  bienNumero: string;
  typeTravaux: TypeTravaux;
  dateDebutPrevue: string;
  dateFinPrevue: string;
  montantEstimatif?: number;
  referenceDevis?: string;
  observations?: string;
  autorisationDpe?: boolean;
}

export interface UpdateTravauxPayload {
  typeTravaux?: TypeTravaux;
  bienNumero?: string;
  dateDebutPrevue?: string;
  dateFinPrevue?: string;
  dateDebutReelle?: string | null;
  dateFinReelle?: string | null;
  montantEstimatif?: number;
  montantReel?: number;
  statut?: StatutTravaux;
  avancementPourcent?: number;
  referenceDevis?: string;
  observations?: string;
  autorisationDpe?: boolean;
  commentaire?: string;
}

export interface UpdateAvancementPayload {
  avancementPourcent?: number;
  statut?: StatutTravaux;
  commentaire?: string;
  dateDebutReelle?: string;
  dateFinReelle?: string;
  montantReel?: number;
  observations?: string;
}
