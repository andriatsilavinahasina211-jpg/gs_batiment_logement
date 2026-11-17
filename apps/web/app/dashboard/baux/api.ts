import type { Bail, StatutBail } from "./types";

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
    if (Array.isArray(obj.baux)) return obj.baux;
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

export function normalizeBail(b: any): Bail {
  const bien = b.bien || {};
  const locataire = b.locataire || {};
  const locataireNom =
    b.locataireNom ||
    [locataire.prenom, locataire.nom].filter(Boolean).join(" ") ||
    undefined;

  return {
    numeroBail: b.numeroBail ?? "",
    dateDebut: toDateInput(b.dateDebut),
    dateFin: toDateInput(b.dateFin),
    montantLoyer:
      b.montantLoyer != null ? Number(b.montantLoyer) : undefined,
    statut: (b.statut as StatutBail) ?? "EN_ATTENTE_MEF",

    accordMef: Boolean(b.accordMef),
    refAccordMef: b.refAccordMef ?? undefined,
    dateAccordMef: toDateInput(b.dateAccordMef) || undefined,
    visaCf: Boolean(b.visaCf),
    refVisaCf: b.refVisaCf ?? undefined,
    dateVisaCf: toDateInput(b.dateVisaCf) || undefined,
    approbationSrb: Boolean(b.approbationSrb),
    enregistreFiscal: Boolean(b.enregistreFiscal),
    refEnregistrementFiscal: b.refEnregistrementFiscal ?? undefined,
    dateEnregistrementFiscal:
      toDateInput(b.dateEnregistrementFiscal) || undefined,

    nomBailleur: b.nomBailleur ?? undefined,
    nifBailleur: b.nifBailleur ?? undefined,
    statBailleur: b.statBailleur ?? undefined,
    ribBailleur: b.ribBailleur ?? undefined,

    bienNumero: b.bienNumero ?? bien.numeroBien ?? "",
    bienNom: b.bienNom ?? bien.nomDuBien ?? undefined,
    locataireId: b.locataireId ?? locataire.occupanId ?? undefined,
    locataireNom,
    demandeReference: b.demandeReference ?? undefined,
    contratPdfUrl: b.contratPdfUrl ?? undefined,
  };
}

/** Inclut demandeReference pour lier le bail à la Demande */
function cleanCreatePayload(
  data: Partial<Bail> & { demandeReference?: string }
) {
  const payload: Record<string, unknown> = {};

  if (data.dateDebut) payload.dateDebut = data.dateDebut;
  if (data.dateFin) payload.dateFin = data.dateFin;
  if (data.montantLoyer != null) payload.montantLoyer = data.montantLoyer;
  if (data.nomBailleur?.trim()) payload.nomBailleur = data.nomBailleur.trim();
  if (data.nifBailleur?.trim()) payload.nifBailleur = data.nifBailleur.trim();
  if (data.statBailleur?.trim()) payload.statBailleur = data.statBailleur.trim();
  if (data.ribBailleur?.trim()) payload.ribBailleur = data.ribBailleur.trim();
  if (data.bienNumero?.trim()) payload.bienNumero = data.bienNumero.trim();
  if (data.locataireId != null && data.locataireId > 0) {
    payload.locataireId = data.locataireId;
  }
  if (data.demandeReference?.trim()) {
    payload.demandeReference = data.demandeReference.trim();
  }

  return payload;
}

function cleanUpdatePayload(
  data: Partial<Bail> & { demandeReference?: string }
) {
  const payload = cleanCreatePayload(data);
  if (data.statut) payload.statut = data.statut;
  return payload;
}

export type ChecklistItem = {
  type: string;
  label: string;
  obligatoire: boolean;
  facultatifAvenant?: boolean;
  fourni: boolean;
  fichierUrl?: string | null;
  commentaire?: string | null;
  dateEmission?: string | null;
  valideIntelligente?: boolean;
  motifInvalide?: string | null;
};

export type CreateAvenantPayload = {
  typeAvenant: string;
  description?: string;
  nouveauMontant?: number;
  nouvelleDateFin?: string;
};

export const bauxApi = {
  getAll: async (): Promise<Bail[]> => {
    const raw = await apiFetch<unknown>("/dashboard/baux");
    return extractList(raw).map(normalizeBail);
  },

  getOne: async (numeroBail: string): Promise<Bail> => {
    const raw = await apiFetch<any>(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}`
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeBail(item);
  },

  create: async (
    data: Partial<Bail> & { demandeReference?: string }
  ): Promise<Bail> => {
    const payload = cleanCreatePayload(data);
    const raw = await apiFetch<any>("/dashboard/baux", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeBail(item);
  },

  update: async (
    numeroBail: string,
    data: Partial<Bail>
  ): Promise<Bail> => {
    const payload = cleanUpdatePayload(data);
    const raw = await apiFetch<any>(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeBail(item);
  },

  remove: (numeroBail: string) =>
    apiFetch<void>(`/dashboard/baux/${encodeURIComponent(numeroBail)}`, {
      method: "DELETE",
    }),

  validerAccordMef: async (
    numeroBail: string,
    data: { refAccordMef: string; dateAccordMef?: string }
  ): Promise<Bail> => {
    const raw = await apiFetch<any>(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}/accord-mef`,
      { method: "POST", body: JSON.stringify(data) }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeBail(item);
  },

  validerVisaCf: async (
    numeroBail: string,
    data: { refVisaCf: string; dateVisaCf?: string }
  ): Promise<Bail> => {
    const raw = await apiFetch<any>(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}/visa-cf`,
      { method: "POST", body: JSON.stringify(data) }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeBail(item);
  },

  approuverSrb: async (numeroBail: string): Promise<Bail> => {
    const raw = await apiFetch<any>(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}/approuver-srb`,
      { method: "POST" }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeBail(item);
  },

  validerEnregistrementFiscal: async (
    numeroBail: string,
    data: {
      refEnregistrementFiscal: string;
      dateEnregistrementFiscal?: string;
    }
  ): Promise<Bail> => {
    const raw = await apiFetch<any>(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}/enregistre-fiscal`,
      { method: "POST", body: JSON.stringify(data) }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeBail(item);
  },

  terminer: async (numeroBail: string): Promise<Bail> => {
    const raw = await apiFetch<any>(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}/terminer`,
      { method: "POST" }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeBail(item);
  },

  renouveler: async (
    numeroBail: string,
    data: {
      nouvelleDateDebut: string;
      nouvelleDateFin: string;
      nouveauMontantLoyer?: number;
    }
  ): Promise<Bail> => {
    const raw = await apiFetch<any>(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}/renouveler`,
      { method: "POST", body: JSON.stringify(data) }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeBail(item);
  },

  getChecklist: async (numeroBail: string): Promise<ChecklistItem[]> => {
    const raw = await apiFetch<unknown>(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}/checklist`
    );
    return extractList(raw) as ChecklistItem[];
  },

  updateChecklist: (numeroBail: string, items: unknown[]) =>
    apiFetch(`/dashboard/baux/${encodeURIComponent(numeroBail)}/checklist`, {
      method: "PATCH",
      body: JSON.stringify({ items }),
    }),

  downloadContratPdf: async (numeroBail: string): Promise<string> => {
    const blob = await apiFetchBlob(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}/contrat/pdf`
    );
    const pdfBlob =
      blob.type === "application/pdf"
        ? blob
        : new Blob([blob], { type: "application/pdf" });
    return URL.createObjectURL(pdfBlob);
  },

  getAvenants: async (numeroBail: string) => {
    const raw = await apiFetch<unknown>(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}/avenants`
    );
    return extractList(raw);
  },

  createAvenant: async (numeroBail: string, data: CreateAvenantPayload) => {
    const raw = await apiFetch<any>(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}/avenants`,
      { method: "POST", body: JSON.stringify(data) }
    );
    return raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
  },

  deleteAvenant: (numeroBail: string, avenantId: string) =>
    apiFetch<void>(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}/avenants/${encodeURIComponent(avenantId)}`,
      { method: "DELETE" }
    ),

  downloadAvenantPdf: async (
    numeroBail: string,
    avenantId: string
  ): Promise<string> => {
    const blob = await apiFetchBlob(
      `/dashboard/baux/${encodeURIComponent(numeroBail)}/avenants/${encodeURIComponent(avenantId)}/pdf`
    );
    const pdfBlob =
      blob.type === "application/pdf"
        ? blob
        : new Blob([blob], { type: "application/pdf" });
    return URL.createObjectURL(pdfBlob);
  },
};