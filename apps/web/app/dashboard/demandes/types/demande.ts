export type TypeDemande =
  | "OCCUPATION"
  | "LIBERATION"
  | "BAIL"
  | "ATTESTATION"
  | "RECENSEMENT"
  | "TRAVAUX";

export type StatutDemande =
  | "EN_ATTENTE"
  | "EN_COURS"
  | "VALIDEE"
  | "REJETEE"
  | "TERMINEE";

export type TypeTravaux =
  | "ENTRETIEN"
  | "REHABILITATION"
  | "AMENAGEMENT"
  | "CONSTRUCTION_NOUVELLE";

export interface CreateDemandeTravauxPayload {
  typeTravaux: TypeTravaux;
  dateDebutPrevue: string;
  dateFinPrevue: string;
  montantEstimatif?: number;
  observations?: string;
}

export interface CreateDemandeRecensementPayload {
  annee: number;
  etatBatiment?: "BON" | "MOYEN" | "MAUVAIS";
  observations?: string;
}

export interface Occupant {
  occupanId: number;
  matricule: string;
  nom: string;
  prenom: string;
  telephone?: string | null;
  email?: string | null;
  ministere?: string | null;
  fonction?: string | null;
}

export interface Bien {
  numeroBien: string;
  nomDuBien: string;
  nature?: string | null;
  adresse?: string | null;
  localite?: string | null;
  statut?: string | null;
}

export interface Validation {
  refValidation: string;
  niveau: number;
  typeValidation?: string | null;
  statut: string;
  commentaire?: string | null;
  dateValidation?: string | null;
}

export interface Demande {
  reference: string;
  typeDemande: TypeDemande;
  statut: StatutDemande;
  motif?: string | null;
  description?: string | null;
  dateValidation?: string | null;
  demandeurId: number;
  demandeur?: Occupant;
  bienNumero?: string | null;
  bien?: Bien | null;
  validations?: Validation[];
  createdAt?: string;
  updatedAt?: string;
}

/** Body POST /dashboard/demandes */
export interface CreateDemandePayload {
  typeDemande: TypeDemande;
  demandeurId: number;
  /** Obligatoire tant que le DTO backend exige statut */
  statut: StatutDemande;
  bienNumero?: string;
  description?: string;
  motif?: string;
  travaux?: CreateDemandeTravauxPayload;
  recensement?: CreateDemandeRecensementPayload;
}

/** Body PATCH /dashboard/demandes/:ref */
export interface UpdateDemandePayload {
  typeDemande?: TypeDemande;
  statut?: StatutDemande;
  bienNumero?: string | null;
  description?: string;
  motif?: string;
  dateValidation?: string;
}