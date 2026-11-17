import type {
  CampagneRecensement,
  Quitus,
  CreateCampagnePayload,
  CreateQuitusPayload,
  BienSimple,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("Erreur API:", res.status, path, body);
    const msg = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message || body.error || `Erreur HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

function extractList(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.quitus)) return obj.quitus;
    if (Array.isArray(obj.campagnes)) return obj.campagnes;
    if (Array.isArray(obj.results)) return obj.results;
  }
  return [];
}

export const recensementApi = {
  // ── Campagnes ───────────────────────────────────────────────────────
  getCampagnes: async (): Promise<CampagneRecensement[]> => {
    const raw = await apiFetch<unknown>("/dashboard/recensement/campagnes");
    return extractList(raw) as CampagneRecensement[];
  },

  getCampagne: (id: string): Promise<CampagneRecensement> =>
    apiFetch<CampagneRecensement>(`/dashboard/recensement/campagnes/${id}`),

  createCampagne: (data: CreateCampagnePayload): Promise<CampagneRecensement> =>
    apiFetch<CampagneRecensement>("/dashboard/recensement/campagnes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  cloturerCampagne: (id: string): Promise<CampagneRecensement> =>
    apiFetch<CampagneRecensement>(`/dashboard/recensement/campagnes/${id}/cloturer`, {
      method: "PATCH",
    }),

  archiverCampagne: (id: string): Promise<CampagneRecensement> =>
    apiFetch<CampagneRecensement>(`/dashboard/recensement/campagnes/${id}/archiver`, {
      method: "PATCH",
    }),

  getBiensSansQuitus: async (campagneId: string): Promise<BienSimple[]> => {
    const raw = await apiFetch<unknown>(
      `/dashboard/recensement/campagnes/${campagneId}/biens-sans-quitus`
    );
    return extractList(raw) as BienSimple[];
  },

  // ── Quitus ──────────────────────────────────────────────────────────
  getAllQuitus: async (params?: {
    annee?: number;
    bienNumero?: string;
  }): Promise<Quitus[]> => {
    const searchParams = new URLSearchParams();
    if (params?.annee) searchParams.set("annee", String(params.annee));
    if (params?.bienNumero) searchParams.set("bienNumero", params.bienNumero);
    const qs = searchParams.toString();
    const raw = await apiFetch<unknown>(
      `/dashboard/recensement/quitus${qs ? `?${qs}` : ""}`
    );
    return extractList(raw) as Quitus[];
  },

  getQuitus: (id: string): Promise<Quitus> =>
    apiFetch<Quitus>(`/dashboard/recensement/quitus/${id}`),

  createQuitus: (data: CreateQuitusPayload): Promise<Quitus> =>
    apiFetch<Quitus>("/dashboard/recensement/quitus", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  validerQuitus: (id: string): Promise<Quitus> =>
    apiFetch<Quitus>(`/dashboard/recensement/quitus/${id}/valider`, {
      method: "PATCH",
    }),

  // ── Données complémentaires ─────────────────────────────────────────
  getAllBiens: async (): Promise<BienSimple[]> => {
    try {
      const raw = await apiFetch<unknown>("/dashboard/biens");
      return extractList(raw) as BienSimple[];
    } catch (e) {
      console.warn("Impossible de charger la liste des biens:", e);
      return [];
    }
  },
};

