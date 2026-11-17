export type StatutQuitus = "BROUILLON" | "VALIDE" | "GENERE";
export type EtatBatisse = "BON" | "MOYEN" | "MAUVAIS";
export type StatutCampagne = "OUVERTE" | "CLOTUREE" | "ARCHIVEE";

export interface CampagneRecensement {
  id: string;
  annee: number;
  dateOuverture: string;
  dateCloture?: string | null;
  statut: StatutCampagne;
  description?: string | null;
  _count?: { quitus: number };
  createdAt?: string;
}

export interface Quitus {
  id: string;
  reference: string;
  annee: number;
  statut: StatutQuitus;
  etatBatiment?: EtatBatisse | null;
  observations?: string | null;
  pdfUrl?: string | null;
  donneesSnapshot?: any;
  bienNumero: string;
  bien?: {
    numeroBien: string;
    nomDuBien: string;
    adresse?: string;
    statut?: string;
    typeBien?: string;
  };
  occupantId?: number | null;
  occupant?: {
    occupanId: number;
    nom: string;
    prenom: string;
    matricule?: string;
  };
  campagneId: string;
  campagne?: {
    id?: string;
    annee: number;
    statut: StatutCampagne;
  };
  createdById?: number;
  createdBy?: {
    nom: string;
    prenom: string;
    matricule?: string;
  };
  createdAt?: string;
}

export interface CreateCampagnePayload {
  annee: number;
  dateOuverture: string;
  dateCloture?: string;
  description?: string;
}

export interface CreateQuitusPayload {
  bienNumero: string;
  campagneId: string;
  occupantId?: number;
  etatBatiment?: EtatBatisse;
  observations?: string;
}

export interface BienSimple {
  numeroBien: string;
  nomDuBien: string;
  adresse?: string;
  statut?: string;
}

