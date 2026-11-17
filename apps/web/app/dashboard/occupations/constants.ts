import type { OccupationStatus } from "./types";

export const statutConfig: Record<
  OccupationStatus,
  { label: string; color: string; bg: string }
> = {
  EN_ATTENTE: { label: "En attente", color: "#64748b", bg: "#f1f5f9" },
  EN_VALIDATION: { label: "En validation", color: "#2563eb", bg: "#eff6ff" },
  APPROUVE: { label: "Approuvé", color: "#16a34a", bg: "#dcfce7" },
  EN_COURS: { label: "En cours", color: "#A67C00", bg: "#fefce8" },
  FIN_PROCHE: { label: "Fin proche", color: "#d97706", bg: "#fffbeb" },
  DEMANDE_LIBERATION: {
    label: "Demande libération",
    color: "#d97706",
    bg: "#fffbeb",
  },
  LIBERATION_VALIDEE: {
    label: "Libération validée",
    color: "#16a34a",
    bg: "#dcfce7",
  },
  LIBERE: { label: "Libéré", color: "#16a34a", bg: "#dcfce7" },
  SANS_TITRE: { label: "Sans titre", color: "#dc2626", bg: "#fee2e2" },
};

export const ITEMS_PER_PAGE = 10;

/** Statuts pour lesquels le bouton « Générer état des lieux » est visible */
export const STATUTS_EDL = [
  "APPROUVE",
  "EN_COURS",
  "FIN_PROCHE",
  "LIBERATION_VALIDEE",
  "LIBERE",
] as const;

export function canGenerateEtatDesLieux(statut: string): boolean {
  return (STATUTS_EDL as readonly string[]).includes(statut);
}

export function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
}

export const canDemanderLiberation = (statut: string) =>
  statut === "EN_COURS";

export const canValiderLiberation = (statut: string) =>
  statut === "DEMANDE_LIBERATION";