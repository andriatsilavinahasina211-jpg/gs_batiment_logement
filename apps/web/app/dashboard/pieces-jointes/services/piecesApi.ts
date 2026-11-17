const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

export type PieceJointe = {
  id: string;
  nomFichier: string;
  url: string;
  typeMime?: string | null;
  taille?: number | null;
  typePiece?: string | null;
  demandeRef?: string | null;
  bienNumero?: string | null;
  bailNumero?: string | null;
  travauxId?: string | null;
  dateEmission?: string | null;
  createdAt?: string;
};

function normalize(p: any): PieceJointe {
  return {
    id: p.id ?? "",
    nomFichier: p.nomFichier ?? "",
    url: p.url ?? "",
    typeMime: p.typeMime ?? null,
    taille: p.taille ?? null,
    typePiece: p.typePiece ?? null,
    demandeRef: p.demandeRef ?? null,
    bienNumero: p.bienNumero ?? null,
    bailNumero: p.bailNumero ?? null,
    travauxId: p.travauxId ?? null,
    dateEmission: p.dateEmission ? String(p.dateEmission).slice(0, 10) : null,
    createdAt: p.createdAt ? String(p.createdAt).slice(0, 10) : undefined,
  };
}

export const piecesApi = {
  /**
   * POST /dashboard/pieces-jointes/upload
   * form-data: file, typePiece, demandeRef, bienNumero?
   */
  upload: async (params: {
    file: File;
    typePiece: string;
    demandeRef?: string;
    bienNumero?: string;
    bailNumero?: string;
    travauxId?: string;
    dateEmission?: string;
  }): Promise<PieceJointe> => {
    const form = new FormData();
    form.append("file", params.file);
    form.append("typePiece", params.typePiece);
    if (params.demandeRef) form.append("demandeRef", params.demandeRef);
    if (params.bienNumero) form.append("bienNumero", params.bienNumero);
    if (params.bailNumero) form.append("bailNumero", params.bailNumero);
    if (params.travauxId) form.append("travauxId", params.travauxId);
    if (params.dateEmission) form.append("dateEmission", params.dateEmission);

    const token = getAuthToken();
    const res = await fetch(`${API_URL}/dashboard/pieces-jointes/upload`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = Array.isArray(body.message)
        ? body.message.join(", ")
        : body.message || body.error || `Erreur HTTP ${res.status}`;
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
    return normalize(await res.json());
  },

  getAll: async (filters?: {
    demandeRef?: string;
    bienNumero?: string;
    typePiece?: string;
  }): Promise<PieceJointe[]> => {
    const q = new URLSearchParams();
    if (filters?.demandeRef) q.set("demandeRef", filters.demandeRef);
    if (filters?.bienNumero) q.set("bienNumero", filters.bienNumero);
    if (filters?.typePiece) q.set("typePiece", filters.typePiece);
    const qs = q.toString();

    const token = getAuthToken();
    const res = await fetch(
      `${API_URL}/dashboard/pieces-jointes${qs ? `?${qs}` : ""}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    if (!res.ok) throw new Error("Impossible de charger les pièces jointes");
    const raw = await res.json();
    const list = Array.isArray(raw) ? raw : raw?.data ?? [];
    return list.map(normalize);
  },

  remove: async (id: string): Promise<void> => {
    const token = getAuthToken();
    const res = await fetch(
      `${API_URL}/dashboard/pieces-jointes/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    if (!res.ok && res.status !== 204) {
      throw new Error("Suppression impossible");
    }
  },

  fileUrl: (url: string) => {
    if (!url) return "#";
    if (url.startsWith("http") || url.startsWith("blob:")) return url;
    return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  },
};