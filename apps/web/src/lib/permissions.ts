
export type UserRole =
  | "ADMINISTRATEUR"
  | "CHEF_SRB"
  | "AGENT";

// ── Matrice complète des permissions par rôle ──────────────────────────
// ADMINISTRATEUR : accès total
// CHEF_SRB       : tout sauf "users"
// AGENT          : dashboard + demandes + audit uniquement
export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  ADMINISTRATEUR: ["*"],

  CHEF_SRB: [
    "dashboard",
    "biens",
    "occupants",
    "occupations",
    "liberations",
    "bail",
    "demandes",
    "attestations",
    "recensement",
    "travaux",
    "notifications",
    "pieces-jointes",
    "audit",
    "ia",
    // "users" intentionnellement absent
  ],

  AGENT: [
    "dashboard",
    "demandes",
    "audit",
    // Tous les autres modules sont bloqués
  ],
};

/**
 * Vérifie si un rôle a accès à un module donné.
 * @param role   - rôle de l'utilisateur (ADMINISTRATEUR | CHEF_SRB | AGENT)
 * @param module - clé du module (ex: "biens", "users", "demandes"…)
 */
export function canAccess(
  role: string | undefined,
  module: string
): boolean {
  if (!role) return false;
  if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) return false;

  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions.includes("*") || permissions.includes(module);
}

/**
 * Retourne la liste des modules accessibles pour un rôle.
 */
export function getAllowedModules(role: string | undefined): readonly string[] {
  if (!role || !Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) return [];
  return ROLE_PERMISSIONS[role as UserRole];
}

