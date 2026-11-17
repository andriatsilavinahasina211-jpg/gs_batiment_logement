// constants/piecesRequises.ts  (ou en tête de DemandeForm)

export const PIECES_OCCUPATION = [
  { code: "DEMANDE_MANUSCRITE", label: "Demande signée", required: true },
  { code: "ACTE_NOMINATION", label: "Acte de nomination", required: true },
  { code: "CNI", label: "Pièce d'identité (CNI)", required: true },
  {
    code: "ATTESTATION_NON_LOGEMENT",
    label: "Attestation de non-logement",
    required: false,
  },
  { code: "AUTRE", label: "Autre pièce", required: false },
] as const;

export const PIECES_LIBERATION = [
  {
    code: "DEMANDE_LIBERATION",
    label: "Demande de libération signée",
    required: true,
  },
  { code: "ACTE_MUTATION", label: "Acte de mutation / décision", required: true },
  {
    code: "ETAT_DES_LIEUX_SORTIE",
    label: "État des lieux de sortie",
    required: false,
  },
  { code: "RECU_CLES", label: "Reçu de restitution des clés", required: false },
  { code: "AUTRE", label: "Autre pièce", required: false },
] as const;