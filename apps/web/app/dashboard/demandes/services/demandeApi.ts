
import type {
  Demande,
  StatutDemande,
  CreateDemandePayload,
  UpdateDemandePayload,
} from "../types/demande";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
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

async function request<T>(
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

    console.error("ERREUR API DEMANDES :", {
      status: res.status,
      path,
      response: body,
    });

    const msg = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message || body.error || `Erreur HTTP ${res.status}`;

    throw new Error(
      typeof msg === "string" ? msg : JSON.stringify(msg)
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
    if (Array.isArray(obj.demandes)) return obj.demandes;
    if (Array.isArray(obj.results)) return obj.results;
  }

  return [];
}

function normalizeDemande(d: any): Demande {
  return {
    reference: d.reference ?? "",
    typeDemande: d.typeDemande,
    statut: d.statut ?? "EN_ATTENTE",
    motif: d.motif ?? null,
    description: d.description ?? null,
    dateValidation: d.dateValidation ?? null,
    demandeurId: d.demandeurId,
    demandeur: d.demandeur,
    bienNumero: d.bienNumero ?? null,
    bien: d.bien ?? null,
    validations: d.validations ?? [],
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function extractTravauxFromDescription(
  description?: string | null
): any | undefined {
  if (!description) return undefined;

  const marker = "[DONNEES_METIER]";
  const index = description.indexOf(marker);

  if (index === -1) return undefined;

  try {
    const json = description
      .slice(index + marker.length)
      .trim();

    const donnees = JSON.parse(json);

    return donnees?.travaux;
  } catch (error) {
    console.error(
      "Erreur lecture données métier des travaux :",
      error
    );

    return undefined;
  }
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

export const demandeApi = {
  getAll: async (query?: {
    statut?: StatutDemande;
    demandeurId?: number;
    search?: string;
  }): Promise<Demande[]> => {
    const params = new URLSearchParams();

    if (query?.statut) {
      params.set("statut", query.statut);
    }

    if (query?.demandeurId) {
      params.set("demandeurId", String(query.demandeurId));
    }

    if (query?.search) {
      params.set("search", query.search);
    }

    const qs = params.toString();

    const raw = await request<unknown>(
      `/dashboard/demandes${qs ? `?${qs}` : ""}`
    );

    return extractList(raw).map(normalizeDemande);
  },

  getOne: async (reference: string): Promise<Demande> => {
    const raw = await request<any>(
      `/dashboard/demandes/${encodeURIComponent(reference)}`
    );

    return normalizeDemande(unwrapResponse(raw));
  },

  create: async (
    payload: CreateDemandePayload
  ): Promise<Demande> => {
    const payloadEtendu = payload as CreateDemandePayload & {
      travaux?: {
        typeTravaux?: string;
        dateDebutPrevue?: string;
        dateFinPrevue?: string;
        montantEstimatif?: number | string;
        observations?: string;
      };
    };

    const body: Record<string, any> = {
      typeDemande: payload.typeDemande,
      demandeurId: Number(payload.demandeurId),
      statut: payload.statut || "EN_ATTENTE",
    };

    if (
      !Number.isFinite(body.demandeurId) ||
      body.demandeurId <= 0
    ) {
      throw new Error("Identifiant du demandeur invalide.");
    }

    if (payload.bienNumero) {
      body.bienNumero = payload.bienNumero;
    }

    if (payload.description) {
      body.description = payload.description;
    }

    if (payload.motif) {
      body.motif = payload.motif;
    }

    if (payload.typeDemande === "RECENSEMENT") {
      if (!payload.recensement) {
        throw new Error(
          "Les informations du recensement sont absentes du formulaire."
        );
      }
      body.recensement = payload.recensement;
    }

    if (payload.typeDemande === "TRAVAUX") {
      const travaux =
        payloadEtendu.travaux ??
        extractTravauxFromDescription(payload.description);

      if (!travaux) {
        throw new Error(
          "Les informations des travaux sont absentes du formulaire."
        );
      }

      if (
        !travaux.typeTravaux ||
        !travaux.dateDebutPrevue ||
        !travaux.dateFinPrevue
      ) {
        throw new Error(
          "Le type de travaux et les deux dates prévisionnelles sont obligatoires."
        );
      }

      const debut = new Date(travaux.dateDebutPrevue);
      const fin = new Date(travaux.dateFinPrevue);

      if (
        Number.isNaN(debut.getTime()) ||
        Number.isNaN(fin.getTime()) ||
        debut >= fin
      ) {
        throw new Error(
          "Les dates des travaux sont invalides. La date de fin doit être postérieure à la date de début."
        );
      }

      const montant =
        travaux.montantEstimatif !== undefined &&
        travaux.montantEstimatif !== null &&
        travaux.montantEstimatif !== ""
          ? Number(travaux.montantEstimatif)
          : undefined;

      if (
        montant !== undefined &&
        (!Number.isFinite(montant) || montant < 0)
      ) {
        throw new Error("Le montant estimatif est invalide.");
      }

      body.travaux = {
        typeTravaux: travaux.typeTravaux,
        dateDebutPrevue: travaux.dateDebutPrevue,
        dateFinPrevue: travaux.dateFinPrevue,
        ...(montant !== undefined
          ? { montantEstimatif: montant }
          : {}),
        ...(travaux.observations?.trim()
          ? { observations: travaux.observations.trim() }
          : {}),
      };
    }

    console.log(
      "PAYLOAD POST /dashboard/demandes :",
      JSON.stringify(body, null, 2)
    );

    const raw = await request<any>(
      "/dashboard/demandes",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    return normalizeDemande(unwrapResponse(raw));
  },

  update: async (
    reference: string,
    payload: UpdateDemandePayload
  ): Promise<Demande> => {
    const body: Record<string, unknown> = {};

    if (payload.typeDemande) {
      body.typeDemande = payload.typeDemande;
    }

    if (payload.statut) {
      body.statut = payload.statut;
    }

    if (payload.bienNumero !== undefined) {
      body.bienNumero = payload.bienNumero;
    }

    if (payload.description !== undefined) {
      body.description = payload.description;
    }

    if (payload.motif !== undefined) {
      body.motif = payload.motif;
    }

    if (payload.dateValidation) {
      body.dateValidation = payload.dateValidation;
    }

    const raw = await request<any>(
      `/dashboard/demandes/${encodeURIComponent(reference)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );

    return normalizeDemande(unwrapResponse(raw));
  },

  updateStatut: async (
    reference: string,
    statut: StatutDemande,
    motif?: string
  ): Promise<Demande> => {
    const raw = await request<any>(
      `/dashboard/demandes/${encodeURIComponent(reference)}/statut`,
      {
        method: "PATCH",
        body: JSON.stringify({ statut, motif }),
      }
    );

    return normalizeDemande(unwrapResponse(raw));
  },

  remove: (reference: string): Promise<void> =>
    request<void>(
      `/dashboard/demandes/${encodeURIComponent(reference)}`,
      {
        method: "DELETE",
      }
    ),
};
