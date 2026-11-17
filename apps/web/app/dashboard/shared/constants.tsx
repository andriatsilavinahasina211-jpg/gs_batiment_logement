export const C = {
  gold: "#C9A227",
  goldDark: "#A67C00",
  goldLight: "#F5E6C8",
  goldBg: "#fefce8",
  green: "#16a34a",
  greenBg: "#dcfce7",
  red: "#dc2626",
  redBg: "#fee2e2",
  bg: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  sidebar: "#f8fafc",
  sidebarBdr: "#e2e8f0",
  blue: "#2563eb",
  neutre: "#F8F6F3"
};

export type NavItem = { label: string; key: string; Icon: () => React.JSX.Element; badge?: number };
export type NavGroup = { group: string; items: NavItem[] };

export const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Tableau de bord", subtitle: "SRB Haute Matsiatra — Vue d’ensemble" },
  biens: { title: "Biens", subtitle: "Gestion des bâtiments et logements administratifs" },
  occupants: { title: "Occupants", subtitle: "Agents et personnes logées" },
  occupations: { title: "Occupations", subtitle: "Suivi des occupations en cours" },
  liberations: { title: "Libérations", subtitle: "Demandes et validations de libération de logements" },
  bail: { title: "Baux", subtitle: "Contrats de location et conventions" },
  demandes: { title: "Demandes", subtitle: "Demandes d’attribution, mutation et travaux" },
  attestations: { title: "Attestations", subtitle: "Génération et validation des attestations" },
  recensement: { title: "Recensement", subtitle: "Campagnes de recensement des biens" },
  travaux: { title: "Travaux", subtitle: "Suivi des travaux et maintenance" },
  notifications: { title: "Notifications", subtitle: "Alertes et messages système" },
  documents: { title: "Documents", subtitle: "Bibliothèque documentaire" },
  "pieces-jointes": { title: "Pièces jointes", subtitle: "Fichiers attachés aux dossiers" },
  audit: { title: "Audit", subtitle: "Journal des actions et traçabilité" },
  ia: { title: "Intelligence IA", subtitle: "Assistant intelligent et analyses" },
  users: { title: "Utilisateurs", subtitle: "Gestion des comptes et droits d’accès" },
};