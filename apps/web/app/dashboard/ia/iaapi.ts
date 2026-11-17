const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ==========================================
// TYPES (correspondent à IaService côté NestJS)
// ==========================================

export type Gravite = "CRITIQUE" | "HAUTE" | "MOYENNE";
type Ref = string | number;

export interface RetardTravaux {
  type: "RETARD_TRAVAUX";
  gravite: Gravite;
  reference: Ref;
  bienNumero: Ref;
  bienNom: string;
  message: string;
  joursRetard: number;
  lien: string;
}

export interface TravauxSansQuitus {
  type: "TRAVAUX_SANS_QUITUS_N1";
  gravite: Gravite;
  reference: Ref;
  bienNumero: Ref;
  bienNom: string;
  message: string;
  lien: string;
}

export interface OccupantSansTitre {
  type: "OCCUPANT_SANS_TITRE";
  gravite: Gravite;
  numeroOccupation: Ref;
  bienNumero: Ref;
  bienNom: string;
  occupant: string;
  message: string;
  lien: string;
}

export interface DoublonAvantage {
  type: "DOUBLON_AVANTAGE_LOGEMENT";
  gravite: Gravite;
  occupant: string;
  occupationRef: Ref;
  bailRef: Ref;
  message: string;
}

export interface BienChantiersMultiples {
  type: "CHANTIERS_MULTIPLES";
  gravite: Gravite;
  bienNumero: Ref;
  bienNom: string;
  nbChantiers: number;
  message: string;
  lien: string;
}

export interface AlerteDelaiOccupation {
  type: "DELAI_DEPASSE" | "DELAI_PROCHE";
  gravite: Gravite;
  numeroOccupation: Ref;
  bienNom: string;
  occupant: string;
  dateSortiePrevue: string | null;
  joursRestants: number;
  message: string;
  lien: string;
}

export interface BienSansQuitus {
  bienNumero: Ref;
  nomDuBien: string;
  message: string;
  lien: string;
}

export interface Analyse {
  generatedAt: string;
  resume: {
    totalAlertes: number;
    niveauRisqueGlobal: string;
  };
  anomalies: {
    retardsTravaux: RetardTravaux[];
    travauxSansQuitus: TravauxSansQuitus[];
    occupantsSansTitre: OccupantSansTitre[];
    doublonsAvantageLogement: DoublonAvantage[];
    biensSurcharges: BienChantiersMultiples[];
  };
  alertes: {
    delaisOccupation: AlerteDelaiOccupation[];
    biensSansQuitusRecent: BienSansQuitus[];
  };
  suggestions: string[];
}

export interface Indicateurs {
  travauxEnRetard: number;
  travauxSansQuitus: number;
  occupantsSansTitre: number;
  occupationsFin30j: number;
  biens: { total: number; libres: number; occupes: number };
  niveauRisque: string;
}

// ==========================================
// APPELS API
// ==========================================

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Récupération du token JWT (même méthode que dashboard-api.ts)
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
      throw new ApiError(
        "Session expirée ou token JWT invalide. Veuillez vous reconnecter.",
        401
      );
    }

    if (response.status === 403) {
      throw new ApiError(
        "Vous n'avez pas les autorisations nécessaires.",
        403
      );
    }

    throw new ApiError(message, response.status);
  }

  return response.json();
}

export const iaApi = {
  // Tous les rôles
  getIndicateurs(): Promise<Indicateurs> {
    return apiFetch<Indicateurs>("/dashboard/ia/indicateurs");
  },

  // Chef SRB et Administrateur uniquement
  getAnalyse(): Promise<Analyse> {
    return apiFetch<Analyse>("/dashboard/ia/analyse");
  },
};