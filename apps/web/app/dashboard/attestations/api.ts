import type {
  Attestation,
  CreateAttestationPayload,
  TypeAttestation,
  StatutAttestation,
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
    const msg = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message || body.error || `Erreur HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

function extractList(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const o = raw as any;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.attestations)) return o.attestations;
    if (Array.isArray(o.items)) return o.items;
  }
  return [];
}

function normalize(a: any): Attestation {
  const type: TypeAttestation =
    a.typeAttestation === "NON_OCCUPATION" ? "NON_OCCUPATION" : "NON_LOGEMENT";

  const statut: StatutAttestation = (
    ["BROUILLON", "VALIDEE", "GENERE", "ARCHIVEE"] as StatutAttestation[]
  ).includes(a.statut)
    ? a.statut
    : "BROUILLON";

  return {
    id: a.id,
    reference: a.reference ?? "",
    typeAttestation: type,
    statut,
    dateGeneration: a.dateGeneration
      ? String(a.dateGeneration).slice(0, 10)
      : undefined,
    visaSuperieur: Boolean(a.visaSuperieur),
    declarationHonneurLegalisee: Boolean(a.declarationHonneurLegalisee),
    demandeurId: a.demandeurId ?? a.demandeur?.occupanId,
    demandeurNom: a.demandeur
      ? `${a.demandeur.prenom ?? ""} ${a.demandeur.nom ?? ""}`.trim()
      : a.demandeurNom,
    createdAt: a.createdAt ? String(a.createdAt).slice(0, 10) : undefined,
    pdfUrl: a.pdfUrl ?? undefined,
  };
}

export const attestationsApi = {
  getAll: async (): Promise<Attestation[]> => {
    const raw = await apiFetch<unknown>("/dashboard/attestations");
    return extractList(raw).map(normalize);
  },

  getOne: async (id: string): Promise<Attestation> => {
    const raw = await apiFetch<any>(
      `/dashboard/attestations/${encodeURIComponent(id)}`
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalize(item);
  },

  /** Création (appelée depuis DemandesPage uniquement) */
  create: async (data: CreateAttestationPayload): Promise<Attestation> => {
    const raw = await apiFetch<any>("/dashboard/attestations", {
      method: "POST",
      body: JSON.stringify({
        typeAttestation: data.typeAttestation,
        demandeurId: data.demandeurId,
        visaSuperieur: data.visaSuperieur,
        declarationHonneurLegalisee: data.declarationHonneurLegalisee,
        commentaire: data.commentaire,
        civilite: data.civilite,
        decretNumero: data.decretNumero,
        decretDate: data.decretDate,
        datePriseService: data.datePriseService,
        numeroOrdre: data.numeroOrdre,
      }),
    });
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalize(item);
  },

  /** Validation Chef SRB */
  valider: async (id: string): Promise<Attestation> => {
    const raw = await apiFetch<any>(
      `/dashboard/attestations/${encodeURIComponent(id)}/valider`,
      { method: "POST" }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalize(item);
  },

  /** Téléchargement PDF (après validation) */
  downloadPdf: async (id: string, reference?: string): Promise<void> => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") ||
          localStorage.getItem("access_token")
        : null;

    const res = await fetch(
      `${API_URL}/dashboard/attestations/${encodeURIComponent(id)}/pdf`,
      {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/pdf",
        },
      }
    );

    if (!res.ok) {
      let msg = `Erreur HTTP ${res.status}`;
      try {
        const body = await res.json();
        msg = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message || body.error || msg;
      } catch {
        // corps non JSON
      }
      throw new Error(msg);
    }

    const blob = await res.blob();
    if (!blob || blob.size === 0) {
      throw new Error("PDF vide reçu du serveur");
    }

    const url = URL.createObjectURL(
      blob.type === "application/pdf"
        ? blob
        : new Blob([blob], { type: "application/pdf" })
    );

    const a = document.createElement("a");
    a.href = url;
    a.download = `attestation-${reference || id}.pdf`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
};