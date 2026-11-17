export type TypeAttestation = "NON_LOGEMENT" | "NON_OCCUPATION";

export type StatutAttestation =
  | "BROUILLON"
  | "VALIDEE"
  | "GENERE"
  | "ARCHIVEE";

export interface Attestation {
  id: string;
  reference: string;
  typeAttestation: TypeAttestation;
  statut: StatutAttestation;
  dateGeneration?: string;
  visaSuperieur: boolean;
  declarationHonneurLegalisee: boolean;
  demandeurId: number;
  demandeurNom?: string;
  createdAt?: string;
  pdfUrl?: string;
}

export type CreateAttestationPayload = {
  typeAttestation: TypeAttestation;
  demandeurId: number;
  visaSuperieur: boolean;
  declarationHonneurLegalisee: boolean;
  commentaire?: string;
  civilite?: string;
  decretNumero?: string;
  decretDate?: string;
  datePriseService?: string;
  numeroOrdre?: string;
};