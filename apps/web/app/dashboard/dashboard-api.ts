const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ====================== TYPES ======================

export interface DemandeRecent {
  id?: number;
  reference?: string;
  typeDemande?: string;
  statut?: string;
  motif?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  demandeur?: {
    nom?: string;
    prenom?: string;
    matricule?: string;
  };
  bien?: {
    nomDuBien?: string;
    localite?: string;
  };
  validations?: {
    statut?: string;
    commentaire?: string;
    dateValidation?: string;
  }[];
}

export interface ValidationRecent {
  id: number;
  dateValidation?: string;
  demande?: {
    id?: number;
    statut?: string;
    demandeur?: {
      nom?: string;
      prenom?: string;
    };
  };
}

export interface OccupationRecent {
  id: number;
  createdAt?: string;
}

export interface AdminDashboard {
  type: "admin";
  global: {
    totalDemandes: number;
    demandesEnAttente?: number;
    demandesEnCours: number;
    demandesValidees: number;
    totalUsers: number;
    totalBiens: number;
    totalBauxActifs: number;
    totalOccupations: number;
    bauxExpirantBientot?: number;
    travauxEnCours?: number;
  };
  recentDemandes: DemandeRecent[];
}

export interface ValidateurDashboard {
  type: "validateur";
  demandesEnAttente: number;
  demandesEnCours?: number;
  bauxExpirantBientot?: number;
  travauxEnCours?: number;
  validationsRecentes: ValidationRecent[];
  mesValidations: number;
  dossiersAValider?: DemandeRecent[];
}

export interface AgentDashboard {
  type: "agent";
  mesDemandes: number;
  demandesEnAttente: number;
  demandesEnCours: number;
  demandesValidees: number;
  demandesRejetees: number;
  recentDemandes: DemandeRecent[];
  historiqueDemandes: DemandeRecent[];
}

export type DashboardStats =
  | AdminDashboard
  | ValidateurDashboard
  | AgentDashboard;

export interface GeneralStats {
  totalUsers: number;
  totalDemandes: number;
  totalBiens: number;
  totalBaux: number;
  totalOccupations: number;
}

export type BienLocalite = {
  numeroBien: string;
  nomDuBien: string;
  statut: string;
  adresse?: string;
  localite: string;
  typeBien?: string;
  nature?: string | null;
};

// ====================== AUTH HEADERS ======================

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token") || localStorage.getItem("access_token")
      : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ====================== FETCH COMMUN ======================

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));

    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message || `Erreur HTTP ${response.status}`;

    if (response.status === 401) {
      throw new Error(
        "Session expirée ou token JWT invalide. Veuillez vous reconnecter."
      );
    }

    if (response.status === 403) {
      throw new Error("Vous n'avez pas les autorisations nécessaires.");
    }

    throw new Error(message);
  }

  return response.json();
}

// ====================== API DASHBOARD ======================

export const dashboardApi = {
  /** Dashboard personnalisé selon le rôle de l'utilisateur connecté */
  getStats(): Promise<DashboardStats> {
    return apiFetch<DashboardStats>("/dashboard/stats");
  },

  /** Statistiques générales agrégées */
  getGeneralStats(): Promise<GeneralStats> {
    return apiFetch<GeneralStats>("/dashboard/general-stats");
  },

  /**
   * Liste des biens pour la carte Leaflet
   * Backend attendu : GET /dashboard/biens/map/points
   */
  getBiensMap(): Promise<BienLocalite[]> {
    return apiFetch<BienLocalite[]>("/dashboard/biens/map/points");
  },
};