export type OccupationStatus =
  | "EN_ATTENTE"
  | "EN_VALIDATION"
  | "APPROUVE"
  | "EN_COURS"
  | "FIN_PROCHE"
  | "DEMANDE_LIBERATION"
  | "LIBERATION_VALIDEE"
  | "LIBERE"
  | "SANS_TITRE";

export interface Occupation {
  numeroOccupation: string;
  dateEntree: string;
  dateSortiePrevue?: string;
  dateSortieReelle?: string;
  statut: OccupationStatus;
  motifLiberation?: string;
  clesRestituees: boolean;
  procedureJudiciaire: boolean;
  delaiJouissanceMois?: number;
  dateAbrogationNomination?: string;
  bienNumero: string;
  bienNom?: string;
  occupantId?: number;
  occupantNom?: string;
  demandeReference?: string;
}

export interface BienOption {
  numeroBien: string;
  nomDuBien: string;
  localite?: string;
  statut?: string;
}

export interface OccupantOption {
  occupanId: number;
  nom: string;
  prenom: string;
  matricule?: string;
  ministere?: string;
}

/** Aligné sur EtatDesLieuxDto (backend NestJS) */
export type TypeEtatDesLieux = "ENTREE" | "SORTIE";

export interface PieceEtatDesLieux {
  designation: string;
  /** 1 = Bon, 2 = Moyen, 3 = Nécessite entretien */
  etat: number;
  caracteristiques: string[];
}

export interface EtatDesLieuxPayload {
  numeroOccupation?: string;
  type: TypeEtatDesLieux;
  date: string; // YYYY-MM-DD ou ISO
  lieu: string;
  descriptionBien?: string;
  pieces: PieceEtatDesLieux[];
  observationsGenerales?: string;
  signataireBailleur: string;
  signataireAdministration: string;
}

//liberation
export type DemandeLiberationPayload = {
  motifLiberation: string;
  dateSortieSouhaitee?: string; // YYYY-MM-DD
  demandeReference?: string;
};

export type ValiderLiberationPayload = {
  dateSortieReelle?: string;
  clesRestituees: boolean;
  observations?: string;
};