
interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: number | string;
  details: string | null;
  userNom: string;
  userMatricule: string;
  userRole: string;
  createdAt: string;
  ipAddress: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));

    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message || body.error || `Erreur HTTP ${res.status}`;

    throw new Error(String(message));
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

function normalizeAudit(a: any): AuditLog {
  return {
    id: a.id,
    action: a.action,
    entity: a.entite,
    entityId: a.entiteId,
    details: a.details,
    userNom: a.user
      ? `${a.user.prenom ?? ""} ${a.user.nom ?? ""}`.trim()
      : "Utilisateur inconnu",
    userMatricule: a.user?.matricule ?? "—",
    userRole: a.user?.role ?? "—",
    createdAt: a.createdAt,
    ipAddress: a.ipAddress ?? "—",
  };
}

export interface AuditFilters {
  userId?: number;
  entite?: string;
  action?: string;
  search?: string;
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  limit?: number;
}

export const auditApi = {
  getAll: async (filters: AuditFilters = {}) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    });

    const raw = await apiFetch<{
      data: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/dashboard/audit?${params.toString()}`);

    return {
      ...raw,
      data: raw.data.map(normalizeAudit),
    };
  },

  getByEntite: async (
    entite: string,
    entiteId: string
  ): Promise<AuditLog[]> => {
    const raw = await apiFetch<any[]>(
      `/dashboard/audit/${encodeURIComponent(entite)}/${encodeURIComponent(entiteId)}`
    );

    return raw.map(normalizeAudit);
  },
};
