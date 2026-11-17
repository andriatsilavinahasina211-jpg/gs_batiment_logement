import type { NotificationItem } from "./types";

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
    const msg = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message || body.error || `Erreur HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

function extractList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.notifications)) return obj.notifications;
    if (Array.isArray(obj.results)) return obj.results;
  }
  return [];
}

export const notificationsApi = {
  getMesNotifications: async (
    nonLuesSeulement = false
  ): Promise<NotificationItem[]> => {
    const qs = nonLuesSeulement ? "?nonLuesSeulement=true" : "";
    const raw = await apiFetch<unknown>(`/dashboard/notifications${qs}`);
    return extractList(raw) as NotificationItem[];
  },

  countNonLues: async (): Promise<number> => {
    const res = await apiFetch<unknown>(
      "/dashboard/notifications/count-non-lues"
    );
    if (typeof res === "number") return res;
    if (res && typeof res === "object" && "count" in res) {
      const { count } = res as { count: unknown };
      if (typeof count === "number") return count;
    }
    throw new Error("Format inattendu pour le nombre de notifications non lues.");
  },

  marquerCommeLue: (id: string): Promise<void> =>
    apiFetch<void>(`/dashboard/notifications/${id}/lire`, {
      method: "PATCH",
    }),

  marquerCommeNonLue: (id: string): Promise<void> =>
    apiFetch<void>(`/dashboard/notifications/${id}/non-lire`, {
      method: "PATCH",
    }),

  marquerToutesLues: (): Promise<void> =>
    apiFetch<void>("/dashboard/notifications/lire-toutes", {
      method: "PATCH",
    }),

  genererAlertes: async (): Promise<{ message: string; alertes: NotificationItem[] }> => {
    return apiFetch<{ message: string; alertes: NotificationItem[] }>(
      "/dashboard/notifications/generer-alertes",
      { method: "POST" }
    );
  },

  supprimer: (id: string): Promise<void> =>
    apiFetch<void>(`/dashboard/notifications/${id}`, {
      method: "DELETE",
    }),
};
