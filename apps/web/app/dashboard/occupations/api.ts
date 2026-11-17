import type {
  Occupation,
  BienOption,
  OccupantOption,
  EtatDesLieuxPayload,
  DemandeLiberationPayload,
  ValiderLiberationPayload,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
    console.error("API error", res.status, path, body);
    const msg = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message || body.error || `Erreur HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function apiFetchBlob(
  path: string,
  options?: RequestInit
): Promise<Blob> {
  const headers: HeadersInit = {
    ...getAuthHeaders(),
    ...(options?.headers || {}),
  };
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let msg = `Erreur HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = Array.isArray(body.message)
        ? body.message.join(", ")
        : body.message || body.error || msg;
    } catch {
      // réponse non JSON
    }
    throw new Error(msg);
  }

  return res.blob();
}

function extractList(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.occupations)) return obj.occupations;
    if (Array.isArray(obj.biens)) return obj.biens;
    if (Array.isArray(obj.occupants)) return obj.occupants;
    if (Array.isArray(obj.results)) return obj.results;
  }
  console.warn("Format API inattendu:", payload);
  return [];
}

function toDateInput(value?: string | Date | null): string {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return String(value).slice(0, 10);
  }
}

export function normalizeOccupation(o: any): Occupation {
  const bien = o.bien || {};
  const occupant = o.occupant || {};
  const occupantNom =
    o.occupantNom ||
    [occupant.prenom, occupant.nom].filter(Boolean).join(" ") ||
    undefined;

  return {
    numeroOccupation: o.numeroOccupation ?? "",
    dateEntree: toDateInput(o.dateEntree),
    dateSortiePrevue: toDateInput(o.dateSortiePrevue) || undefined,
    dateSortieReelle: toDateInput(o.dateSortieReelle) || undefined,
    statut: o.statut ?? "EN_ATTENTE",
    motifLiberation: o.motifLiberation ?? undefined,
    clesRestituees: Boolean(o.clesRestituees),
    procedureJudiciaire: Boolean(o.procedureJudiciaire),
    delaiJouissanceMois:
      o.delaiJouissanceMois != null ? Number(o.delaiJouissanceMois) : undefined,
    dateAbrogationNomination:
      toDateInput(o.dateAbrogationNomination) || undefined,
    bienNumero: o.bienNumero ?? bien.numeroBien ?? "",
    bienNom: o.bienNom ?? bien.nomDuBien ?? undefined,
    occupantId: o.occupantId ?? occupant.occupanId ?? undefined,
    occupantNom,
    demandeReference: o.demandeReference ?? undefined,
  };
}

function cleanPayload(data: Partial<Occupation>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (data.dateEntree) payload.dateEntree = data.dateEntree;
  if (data.dateSortiePrevue) payload.dateSortiePrevue = data.dateSortiePrevue;
  if (data.dateSortieReelle) payload.dateSortieReelle = data.dateSortieReelle;
  if (data.statut) payload.statut = data.statut;

  if (data.motifLiberation?.trim()) {
    payload.motifLiberation = data.motifLiberation.trim();
  }
  if (data.clesRestituees !== undefined) {
    payload.clesRestituees = data.clesRestituees;
  }
  if (data.procedureJudiciaire !== undefined) {
    payload.procedureJudiciaire = data.procedureJudiciaire;
  }
  if (data.delaiJouissanceMois != null && data.delaiJouissanceMois > 0) {
    payload.delaiJouissanceMois = data.delaiJouissanceMois;
  }
  if (data.bienNumero?.trim()) {
    payload.bienNumero = data.bienNumero.trim();
  }

  if (data.occupantId != null && data.occupantId > 0) {
    payload.occupantId = data.occupantId;
    payload.demandeurId = data.occupantId;
  }

  if (data.demandeReference?.trim()) {
    payload.demandeReference = data.demandeReference.trim();
  }

  return payload;
}

/** Payload libération étendu (demandeReference optionnel) */
export type DemanderLiberationData = DemandeLiberationPayload & {
  demandeReference?: string;
  dateSortieSouhaitee?: string;
  motifLiberation?: string;
};

export const occupationsApi = {
  async enforceSingleBienRule(
    occupantId: number | undefined,
    bienNumero: string | undefined,
    currentOccupationId?: string
  ) {
    if (!occupantId) return;
    const all = await occupationsApi.getAll();
    const conflict = all.find(
      (o) =>
        o.occupantId === occupantId &&
        o.bienNumero !== bienNumero &&
        o.numeroOccupation !== currentOccupationId
    );
    if (conflict) {
      throw new Error(
        `L'occupant ${occupantId} est déjà associé au bien ${conflict.bienNumero}. Un occupant ne peut occuper qu'un seul bien.`
      );
    }
  },

  getAll: async (): Promise<Occupation[]> => {
    const raw = await apiFetch<unknown>("/dashboard/occupations");
    return extractList(raw).map(normalizeOccupation);
  },

  create: async (data: Occupation): Promise<Occupation> => {
    const payload = cleanPayload(data);
    await occupationsApi.enforceSingleBienRule(
      typeof payload.occupantId === "number" ? payload.occupantId : undefined,
      typeof payload.bienNumero === "string" ? payload.bienNumero : undefined
    );
    const raw = await apiFetch<any>("/dashboard/occupations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeOccupation(item);
  },

  update: async (
    numeroOccupation: string,
    data: Partial<Occupation>
  ): Promise<Occupation> => {
    const payload = cleanPayload(data);
    await occupationsApi.enforceSingleBienRule(
      typeof payload.occupantId === "number" ? payload.occupantId : undefined,
      typeof payload.bienNumero === "string" ? payload.bienNumero : undefined,
      numeroOccupation
    );
    const raw = await apiFetch<any>(
      `/dashboard/occupations/${encodeURIComponent(numeroOccupation)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeOccupation(item);
  },

  remove: (numeroOccupation: string) =>
    apiFetch<void>(
      `/dashboard/occupations/${encodeURIComponent(numeroOccupation)}`,
      { method: "DELETE" }
    ),

  /** Valider une occupation (APPROUVE + Demande VALIDEE) */
  valider: async (numeroOccupation: string): Promise<Occupation> => {
    const raw = await apiFetch<any>(
      `/dashboard/occupations/${encodeURIComponent(numeroOccupation)}/valider`,
      { method: "PATCH" }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeOccupation(item);
  },

  generateEtatDesLieux: async (
    numeroOccupation: string,
    data: EtatDesLieuxPayload
  ): Promise<string> => {
    console.log("Payload EDL →", JSON.stringify(data, null, 2));

    if (!data.pieces || data.pieces.length === 0) {
      throw new Error("Aucune pièce à envoyer (pieces vide)");
    }

    const blob = await apiFetchBlob(
      `/dashboard/occupations/${encodeURIComponent(numeroOccupation)}/etat-des-lieux/pdf`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    const pdfBlob =
      blob.type === "application/pdf"
        ? blob
        : new Blob([blob], { type: "application/pdf" });
    return URL.createObjectURL(pdfBlob);
  },

  /**
   * Demande de libération
   * → occupation passe en DEMANDE_LIBERATION (onglet Libérations / en attente)
   */
  demanderLiberation: async (
    numeroOccupation: string,
    data: DemanderLiberationData
  ): Promise<Occupation> => {
    const body: Record<string, unknown> = {};
    if (data.motifLiberation?.trim()) {
      body.motifLiberation = data.motifLiberation.trim();
    }
    if (data.dateSortieSouhaitee) {
      body.dateSortieSouhaitee = data.dateSortieSouhaitee;
    }
    if (data.demandeReference?.trim()) {
      body.demandeReference = data.demandeReference.trim();
    }

    const raw = await apiFetch<any>(
      `/dashboard/occupations/${encodeURIComponent(numeroOccupation)}/liberation/demander`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeOccupation(item);
  },

  validerLiberation: async (
    numeroOccupation: string,
    data: ValiderLiberationPayload
  ): Promise<Occupation> => {
    const raw = await apiFetch<any>(
      `/dashboard/occupations/${encodeURIComponent(numeroOccupation)}/liberation/valider`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeOccupation(item);
  },

  refuserLiberation: async (
    numeroOccupation: string,
    motif?: string
  ): Promise<Occupation> => {
    const raw = await apiFetch<any>(
      `/dashboard/occupations/${encodeURIComponent(numeroOccupation)}/refuser-liberation`,
      {
        method: "POST",
        body: JSON.stringify({ motif }),
      }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeOccupation(item);
  },
};

export const biensApi = {
  getAll: async (): Promise<BienOption[]> => {
    const raw = await apiFetch<unknown>("/dashboard/biens");
    return extractList(raw).map((b: any) => ({
      numeroBien: b.numeroBien ?? "",
      nomDuBien: b.nomDuBien ?? b.nom ?? "",
      localite: b.localite ?? "",
      statut: b.statut ?? "",
    }));
  },
};

export const occupantsApi = {
  getAll: async (): Promise<OccupantOption[]> => {
    const raw = await apiFetch<unknown>("/dashboard/occupants");
    return extractList(raw).map((o: any) => ({
      occupanId: o.occupanId ?? o.id,
      nom: o.nom ?? "",
      prenom: o.prenom ?? "",
      matricule: o.matricule ?? "",
      ministere: o.ministere ?? "",
    }));
  },
};