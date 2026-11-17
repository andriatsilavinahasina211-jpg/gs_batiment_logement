
import type {
  Travaux,
  CreateTravauxPayload,
  UpdateTravauxPayload,
  UpdateAvancementPayload,
  HistoriqueItem,
} from "./types";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token") ||
        localStorage.getItem("access_token")
      : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    console.error("API Travaux error:", {
      status: res.status,
      path,
      body,
    });

    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message || body?.error || `Erreur HTTP ${res.status}`;

    throw new Error(
      typeof message === "string" ? message : JSON.stringify(message)
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

function extractList(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, any>;

    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.travaux)) return obj.travaux;
    if (Array.isArray(obj.results)) return obj.results;
  }

  return [];
}

function unwrapResponse(raw: any): any {
  if (
    raw?.data &&
    typeof raw.data === "object" &&
    !Array.isArray(raw.data)
  ) {
    return raw.data;
  }

  return raw;
}

function toDateInput(value?: string | Date | null): string {
  if (!value) return "";

  if (typeof value === "string") {
    // Évite les décalages de jour liés au fuseau horaire
    const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateOnly) return dateOnly[0];
  }

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return String(value).slice(0, 10);
  }
}

export function normalizeTravaux(t: any): Travaux {
  if (!t || typeof t !== "object") {
    throw new Error("Réponse API travaux invalide.");
  }

  const bien = t.bien || {};

  return {
    id: t.id ?? "",
    reference: t.reference ?? "",
    typeTravaux: t.typeTravaux,

    dateDebutPrevue: toDateInput(t.dateDebutPrevue),
    dateFinPrevue: toDateInput(t.dateFinPrevue),
    dateDebutReelle: toDateInput(t.dateDebutReelle) || undefined,
    dateFinReelle: toDateInput(t.dateFinReelle) || undefined,

    montantEstimatif:
      t.montantEstimatif != null
        ? Number(t.montantEstimatif)
        : undefined,

    montantReel:
      t.montantReel != null ? Number(t.montantReel) : undefined,

    statut: t.statut ?? "EN_ATTENTE",
    avancementPourcent: Number(t.avancementPourcent ?? 0),

    referenceDevis: t.referenceDevis ?? undefined,
    observations: t.observations ?? undefined,

    quitusN1Present: Boolean(
      t.quitusN1Present ?? t.alerteQuitusAbsent === false
    ),

    autorisationDpe: Boolean(t.autorisationDpe),

    bienNumero: t.bienNumero ?? bien.numeroBien ?? "",
    bienNom: bien.nomDuBien ?? t.bienNom ?? undefined,

    bien: bien.nomDuBien
      ? {
          nomDuBien: bien.nomDuBien,
          adresse: bien.adresse,
          typeBien: bien.typeBien,
        }
      : undefined,

    createdBy: t.createdBy,

    enRetard:
      Boolean(t.enRetard) ||
      (!["TERMINE", "ANNULE"].includes(t.statut) &&
        Boolean(t.dateFinPrevue) &&
        new Date(t.dateFinPrevue) < new Date()),

    historique: Array.isArray(t.historique) ? t.historique : [],

    createdAt: toDateInput(t.createdAt),
    updatedAt: toDateInput(t.updatedAt),
  };
}

export interface BienOption {
  numeroBien: string;
  nomDuBien: string;
  adresse?: string;
  statut?: string;
}

export const travauxApi = {
  getAll: async (filters?: {
    statut?: string;
    bienNumero?: string;
    retardSeulement?: boolean;
  }): Promise<Travaux[]> => {
    const q = new URLSearchParams();

    if (filters?.statut && filters.statut !== "TOUS") {
      q.set("statut", filters.statut);
    }

    if (filters?.bienNumero) {
      q.set("bienNumero", filters.bienNumero);
    }

    if (filters?.retardSeulement) {
      q.set("retardSeulement", "true");
    }

    const qs = q.toString();

    const raw = await apiFetch<unknown>(
      `/dashboard/travaux${qs ? `?${qs}` : ""}`
    );

    return extractList(raw).map(normalizeTravaux);
  },

  getOne: async (id: string): Promise<Travaux> => {
    const raw = await apiFetch<any>(
      `/dashboard/travaux/${encodeURIComponent(id)}`
    );

    return normalizeTravaux(unwrapResponse(raw));
  },

  getHistorique: async (id: string): Promise<HistoriqueItem[]> => {
    const raw = await apiFetch<unknown>(
      `/dashboard/travaux/${encodeURIComponent(id)}/historique`
    );

    return extractList(raw);
  },

  getEnRetard: async (): Promise<Travaux[]> => {
    const raw = await apiFetch<unknown>(
      "/dashboard/travaux/en-retard"
    );

    return extractList(raw).map(normalizeTravaux);
  },

  getSansQuitusN1: async (): Promise<Travaux[]> => {
    const raw = await apiFetch<unknown>(
      "/dashboard/travaux/sans-quitus-n1"
    );

    return extractList(raw).map(normalizeTravaux);
  },

  /**
   * Création d'un travail depuis une demande.
   *
   * IMPORTANT :
   * Le contrôleur NestJS reçoit directement CreateTravauxDto.
   * Il ne faut PAS envoyer { travaux: payload }.
   */
  create: async (payload: CreateTravauxPayload): Promise<Travaux> => {
    if (!payload.bienNumero?.trim()) {
      throw new Error("Le numéro du bien est obligatoire.");
    }

    if (!payload.typeTravaux) {
      throw new Error("Le type de travaux est obligatoire.");
    }

    if (!payload.dateDebutPrevue || !payload.dateFinPrevue) {
      throw new Error("Les dates prévisionnelles sont obligatoires.");
    }

    if (
      new Date(payload.dateDebutPrevue) >=
      new Date(payload.dateFinPrevue)
    ) {
      throw new Error(
        "La date de fin doit être postérieure à la date de début."
      );
    }

    const body = {
      bienNumero: payload.bienNumero.trim(),
      typeTravaux: payload.typeTravaux,
      dateDebutPrevue: payload.dateDebutPrevue,
      dateFinPrevue: payload.dateFinPrevue,

      ...(payload.montantEstimatif != null
        ? { montantEstimatif: Number(payload.montantEstimatif) }
        : {}),

      ...(payload.referenceDevis?.trim()
        ? { referenceDevis: payload.referenceDevis.trim() }
        : {}),

      ...(payload.observations?.trim()
        ? { observations: payload.observations.trim() }
        : {}),

      autorisationDpe: Boolean(payload.autorisationDpe),
    };

    console.log("POST /dashboard/travaux :", body);

    const raw = await apiFetch<any>("/dashboard/travaux", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const result = unwrapResponse(raw);

    console.log("Travaux créé :", result);

    return normalizeTravaux(result);
  },

  update: async (
    id: string,
    payload: UpdateTravauxPayload
  ): Promise<Travaux> => {
    const body: Record<string, unknown> = {};

    if (payload.typeTravaux) {
      body.typeTravaux = payload.typeTravaux;
    }

    if (payload.bienNumero?.trim()) {
      body.bienNumero = payload.bienNumero.trim();
    }

    if (payload.dateDebutPrevue) {
      body.dateDebutPrevue = payload.dateDebutPrevue;
    }

    if (payload.dateFinPrevue) {
      body.dateFinPrevue = payload.dateFinPrevue;
    }

    if (payload.dateDebutReelle !== undefined) {
      body.dateDebutReelle = payload.dateDebutReelle || null;
    }

    if (payload.dateFinReelle !== undefined) {
      body.dateFinReelle = payload.dateFinReelle || null;
    }

    if (payload.montantEstimatif !== undefined) {
      body.montantEstimatif =
        payload.montantEstimatif != null
          ? Number(payload.montantEstimatif)
          : null;
    }

    if (payload.montantReel !== undefined) {
      body.montantReel =
        payload.montantReel != null
          ? Number(payload.montantReel)
          : null;
    }

    if (payload.statut) {
      body.statut = payload.statut;
    }

    if (payload.avancementPourcent !== undefined) {
      body.avancementPourcent = Number(payload.avancementPourcent);
    }

    if (payload.referenceDevis !== undefined) {
      body.referenceDevis = payload.referenceDevis?.trim() || null;
    }

    if (payload.observations !== undefined) {
      body.observations = payload.observations?.trim() || null;
    }

    if (payload.autorisationDpe !== undefined) {
      body.autorisationDpe = Boolean(payload.autorisationDpe);
    }

    if (payload.commentaire?.trim()) {
      body.commentaire = payload.commentaire.trim();
    }

    const raw = await apiFetch<any>(
      `/dashboard/travaux/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );

    return normalizeTravaux(unwrapResponse(raw));
  },

  updateAvancement: async (
    id: string,
    payload: UpdateAvancementPayload
  ): Promise<Travaux> => {
    const body: Record<string, unknown> = {};

    if (payload.avancementPourcent !== undefined) {
      body.avancementPourcent = Number(payload.avancementPourcent);
    }

    if (payload.statut) {
      body.statut = payload.statut;
    }

    if (payload.commentaire?.trim()) {
      body.commentaire = payload.commentaire.trim();
    }

    if (payload.dateDebutReelle) {
      body.dateDebutReelle = payload.dateDebutReelle;
    }

    if (payload.dateFinReelle) {
      body.dateFinReelle = payload.dateFinReelle;
    }

    if (payload.montantReel !== undefined) {
      body.montantReel =
        payload.montantReel != null
          ? Number(payload.montantReel)
          : null;
    }

    if (payload.observations !== undefined) {
      body.observations = payload.observations?.trim() || null;
    }

    const raw = await apiFetch<any>(
      `/dashboard/travaux/${encodeURIComponent(id)}/avancement`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );

    return normalizeTravaux(unwrapResponse(raw));
  },

  remove: async (id: string): Promise<void> => {
    await apiFetch<void>(
      `/dashboard/travaux/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    );
  },

  getBiens: async (): Promise<BienOption[]> => {
    try {
      const raw = await apiFetch<unknown>("/dashboard/biens");
      const list = extractList(raw);

      return list.map((b: any) => ({
        numeroBien: b.numeroBien ?? b.id ?? "",
        nomDuBien: b.nomDuBien ?? b.nom ?? b.numeroBien ?? "",
        adresse: b.adresse,
        statut: b.statut,
      }));
    } catch (err) {
      console.warn("Impossible de précharger les biens:", err);
      return [];
    }
  },
};