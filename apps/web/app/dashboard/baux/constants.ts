import type { StatutBail } from "./types";

export const ITEMS_PER_PAGE = 10;

export const statutConfig: Record<
  StatutBail,
  { label: string; color: string; bg: string }
> = {
  EN_ATTENTE_MEF: { label: "Attente MEF", color: "#64748b", bg: "#f1f5f9" },
  VISA_CF_SOUMIS: { label: "Visa CF soumis", color: "#2563eb", bg: "#eff6ff" },
  VISA_CF_VALIDE: { label: "Visa CF validé", color: "#16a34a", bg: "#dcfce7" },
  EN_COURS: { label: "En cours", color: "#A67C00", bg: "#fefce8" },
  TERMINE: { label: "Terminé", color: "#64748b", bg: "#f1f5f9" },
  RENOUVELE: { label: "Renouvelé", color: "#16a34a", bg: "#dcfce7" },
  RESILIE: { label: "Résilié", color: "#dc2626", bg: "#fee2e2" },
};

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
}

export function formatMoney(n?: number): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MGA",
    maximumFractionDigits: 0,
  }).format(n);
}