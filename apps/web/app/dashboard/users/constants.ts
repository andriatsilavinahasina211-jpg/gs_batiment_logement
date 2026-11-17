import type { Role, AuthProvider } from "./types";

export const roleConfig: Record<
  Role,
  { label: string; color: string; bg: string }
> = {
  AGENT: { label: "Agent", color: "#2563eb", bg: "#eff6ff" },
  CHEF_SRB: { label: "Chef SRB", color: "#A67C00", bg: "#fefce8" },
  ADMINISTRATEUR: { label: "Administrateur", color: "#7c3aed", bg: "#f5f3ff" },
};

export const providerLabel: Record<AuthProvider, string> = {
  EMAIL: "Email",
  GOOGLE: "Google",
};

export const ITEMS_PER_PAGE = 10;

export const formatDate = (iso?: string) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
};

export const initials = (prenom: string, nom: string) =>
  `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase();