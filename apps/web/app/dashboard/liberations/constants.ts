import type { Occupation } from "../occupations/types";

export const STATUTS_LIBERATION = [
  "EN_COURS",
  "APPROUVE",
  "FIN_PROCHE",
  "DEMANDE_LIBERATION",
  "LIBERATION_VALIDEE",
  "LIBERE",
] as const;

export type Tab = "demandes" | "en_cours" | "historique";

export const TABS: { key: Tab; label: string }[] = [
  { key: "demandes", label: "Demandes en attente" },
  { key: "en_cours", label: "Occupations en cours (éligibles)" },
  { key: "historique", label: "Historique des libérations" },
];

export function tabFilter(tab: Tab, o: Occupation): boolean {
  switch (tab) {
    case "demandes":
      return o.statut === "DEMANDE_LIBERATION";
    case "en_cours":
      return (
        o.statut === "EN_COURS" ||
        o.statut === "APPROUVE" ||
        o.statut === "FIN_PROCHE"
      );
    case "historique":
      return o.statut === "LIBERATION_VALIDEE" || o.statut === "LIBERE";
    default:
      return false;
  }
}