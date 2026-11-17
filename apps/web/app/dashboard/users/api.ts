import type { User } from "./types";

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

function extractList(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.users)) return obj.users;
    if (Array.isArray(obj.results)) return obj.results;
  }
  console.warn("Format API inattendu:", payload);
  return [];
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const raw = await apiFetch<unknown>("/users");
    return extractList(raw) as User[];
  },

  getOne: (id: number) => apiFetch<User>(`/users/${id}`),

  create: (data: Record<string, unknown>) =>
    apiFetch<User>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Record<string, unknown>) =>
    apiFetch<User>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  remove: (id: number) =>
    apiFetch<void>(`/users/${id}`, {
      method: "DELETE",
    }),
};