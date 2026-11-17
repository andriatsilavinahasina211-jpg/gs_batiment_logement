"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { C } from "../shared/constants";
import "./OccupantsPage.css";
import { useFeedback } from "../shared/feedback";

/* ───────────────── Config API NestJS ───────────────── */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ───────────────── Types ───────────────── */
interface Occupant {
  occupanId: number;
  matricule: string;
  nom: string;
  prenom: string;
  cin?: string;
  telephone?: string;
  email?: string;
  ministere?: string;
  fonction?: string;
  codeMinistere?: string;
}

/* ───────────────── Client API ───────────────── */
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
    if (Array.isArray(obj.occupants)) return obj.occupants;
    if (Array.isArray(obj.results)) return obj.results;
    if (Array.isArray(obj.records)) return obj.records;
  }
  console.warn("Format API occupants inattendu:", payload);
  return [];
}

function normalizeOccupant(o: any): Occupant {
  return {
    occupanId: o.occupanId ?? o.id ?? 0,
    matricule: o.matricule ?? "",
    nom: o.nom ?? "",
    prenom: o.prenom ?? "",
    cin: o.cin ?? undefined,
    telephone: o.telephone ?? undefined,
    email: o.email ?? undefined,
    ministere: o.ministere ?? undefined,
    fonction: o.fonction ?? undefined,
    codeMinistere: o.codeMinistere ?? undefined,
  };
}

/** Corps propre pour Nest (pas de "", pas d'id en create) */
function cleanPayload(data: Partial<Occupant>, isCreate = false): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (data.matricule != null && String(data.matricule).trim()) {
    payload.matricule = String(data.matricule).trim();
  }
  if (data.nom != null && String(data.nom).trim()) {
    payload.nom = String(data.nom).trim();
  }
  if (data.prenom != null && String(data.prenom).trim()) {
    payload.prenom = String(data.prenom).trim();
  }
  if (data.cin != null && String(data.cin).trim()) {
    payload.cin = String(data.cin).trim();
  }
  if (data.telephone != null && String(data.telephone).trim()) {
    payload.telephone = String(data.telephone).trim();
  }
  if (data.email != null && String(data.email).trim()) {
    payload.email = String(data.email).trim();
  }
  if (data.ministere != null && String(data.ministere).trim()) {
    payload.ministere = String(data.ministere).trim();
  }
  if (data.fonction != null && String(data.fonction).trim()) {
    payload.fonction = String(data.fonction).trim();
  }
  if (data.codeMinistere != null && String(data.codeMinistere).trim()) {
    payload.codeMinistere = String(data.codeMinistere).trim();
  }

  // Ne jamais envoyer occupanId en create
  if (!isCreate && data.occupanId != null) {
    // id uniquement dans l'URL
  }

  return payload;
}

const occupantsApi = {
  getAll: async (params?: { search?: string; ministere?: string }): Promise<Occupant[]> => {
    const qs = new URLSearchParams();
    if (params?.search?.trim()) qs.set("search", params.search.trim());
    if (params?.ministere && params.ministere !== "TOUS") {
      qs.set("ministere", params.ministere);
    }
    const query = qs.toString() ? `?${qs.toString()}` : "";
    const raw = await apiFetch<unknown>(`/dashboard/occupants${query}`);
    return extractList(raw).map(normalizeOccupant);
  },

  create: async (data: Occupant): Promise<Occupant> => {
    const payload = cleanPayload(data, true);
    console.log("POST /dashboard/occupants →", payload);
    const raw = await apiFetch<any>("/dashboard/occupants", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeOccupant(item);
  },

  update: async (id: number, data: Partial<Occupant>): Promise<Occupant> => {
    const payload = cleanPayload(data, false);
    console.log("PATCH /dashboard/occupants/" + id, payload);
    const raw = await apiFetch<any>(`/dashboard/occupants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeOccupant(item);
  },

  remove: (id: number) =>
    apiFetch<void>(`/dashboard/occupants/${id}`, { method: "DELETE" }),
};

const ITEMS_PER_PAGE = 10;

/* ───────────────── Formulaire ───────────────── */
function OccupantForm({
  mode,
  occupant,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  occupant?: Occupant;
  onClose: () => void;
  onSave: (data: Occupant) => void | Promise<void>;
}) {
  const emptyForm: Occupant = {
    occupanId: 0,
    matricule: "",
    nom: "",
    prenom: "",
    cin: "",
    telephone: "",
    email: "",
    ministere: "",
    fonction: "",
    codeMinistere: "",
  };

  const [form, setForm] = useState<Occupant>(
    mode === "edit" && occupant ? { ...occupant } : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Occupant, string>>>({}); 

  /** Valide un champ unique à la saisie */
  const validateField = (field: keyof Occupant, value: string): string => {
    if (field === "cin" && value.trim()) {
      if (!/^\d{12}$/.test(value.trim()))
        return "Le CIN doit comporter exactement 12 chiffres.";
    }
    if (field === "telephone" && value.trim()) {
      if (!/^\d{10}$/.test(value.trim()))
        return "Le numéro de téléphone doit comporter exactement 10 chiffres.";
    }
    if (field === "email" && value.trim()) {
      if (!value.includes("@"))
        return "L'adresse email doit contenir un @.";
    }
    return "";
  };

  const handleChange = (field: keyof Occupant, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    const err = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  /** Validation complète avant soumission */
  const validateAll = (): boolean => {
    const newErrors: Partial<Record<keyof Occupant, string>> = {};
    let valid = true;

    if (!form.matricule.trim()) {
      newErrors.matricule = "Le matricule est obligatoire.";
      valid = false;
    }
    if (!form.nom.trim()) {
      newErrors.nom = "Le nom est obligatoire.";
      valid = false;
    }
    if (!form.prenom.trim()) {
      newErrors.prenom = "Le prénom est obligatoire.";
      valid = false;
    }
    const cinErr = validateField("cin", form.cin || "");
    if (cinErr) { newErrors.cin = cinErr; valid = false; }
    const telErr = validateField("telephone", form.telephone || "");
    if (telErr) { newErrors.telephone = telErr; valid = false; }
    const emailErr = validateField("email", form.email || "");
    if (emailErr) { newErrors.email = emailErr; valid = false; }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="occupants-modal-overlay form" onClick={onClose}>
      <div className="occupants-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="occupants-form-header">
          <div>
            <h2>{mode === "create" ? "Ajouter un occupant" : "Modifier l'occupant"}</h2>
            {mode === "edit" && <p>{occupant?.matricule}</p>}
          </div>
          <button className="occupants-form-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="occupants-form-body">
          <div className="occupants-form-fields">
            <div>
              <label className="occupants-form-label">Matricule Solde *</label>
              <input
                type="text"
                required
                value={form.matricule}
                onChange={(e) => handleChange("matricule", e.target.value)}
                className="occupants-form-input"
                placeholder="Ex: 123.456"
                disabled={mode === "edit"}
              />
            </div>

            <div className="occupants-form-row">
              <div>
                <label className="occupants-form-label">Nom *</label>
                <input
                  type="text"
                  required
                  value={form.nom}
                  onChange={(e) => handleChange("nom", e.target.value)}
                  className="occupants-form-input"
                  placeholder="Nom"
                />
              </div>
              <div>
                <label className="occupants-form-label">Prénom *</label>
                <input
                  type="text"
                  required
                  value={form.prenom}
                  onChange={(e) => handleChange("prenom", e.target.value)}
                  className="occupants-form-input"
                  placeholder="Prénom"
                />
              </div>
            </div>

            <div>
              <label className="occupants-form-label">CIN</label>
              <input
                type="text"
                value={form.cin || ""}
                onChange={(e) => handleChange("cin", e.target.value)}
                className={`occupants-form-input${errors.cin ? " occupants-input-error" : ""}`}
                placeholder="12 chiffres (ex: 101234567890)"
                maxLength={12}
                inputMode="numeric"
              />
              {errors.cin && (
                <span className="occupants-field-error">{errors.cin}</span>
              )}
            </div>

            <div className="occupants-form-row">
              <div>
                <label className="occupants-form-label">Téléphone</label>
                <input
                  type="text"
                  value={form.telephone || ""}
                  onChange={(e) => handleChange("telephone", e.target.value)}
                  className={`occupants-form-input${errors.telephone ? " occupants-input-error" : ""}`}
                  placeholder="10 chiffres (ex: 0340000000)"
                  maxLength={10}
                  inputMode="numeric"
                />
                {errors.telephone && (
                  <span className="occupants-field-error">{errors.telephone}</span>
                )}
              </div>
              <div>
                <label className="occupants-form-label">Email</label>
                <input
                  type="text"
                  value={form.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className={`occupants-form-input${errors.email ? " occupants-input-error" : ""}`}
                  placeholder="email@exemple.mg"
                />
                {errors.email && (
                  <span className="occupants-field-error">{errors.email}</span>
                )}
              </div>
            </div>

            <div>
              <label className="occupants-form-label">Ministère</label>
              <input
                type="text"
                value={form.ministere || ""}
                onChange={(e) => handleChange("ministere", e.target.value)}
                className="occupants-form-input"
                placeholder="Ex: Ministère de l'Éducation Nationale"
              />
            </div>

            <div className="occupants-form-row">
              <div>
                <label className="occupants-form-label">Code Ministère</label>
                <input
                  type="text"
                  value={form.codeMinistere || ""}
                  onChange={(e) => handleChange("codeMinistere", e.target.value)}
                  className="occupants-form-input"
                  placeholder="Ex: 63-MEN"
                />
              </div>
              <div>
                <label className="occupants-form-label">Fonction</label>
                <input
                  type="text"
                  value={form.fonction || ""}
                  onChange={(e) => handleChange("fonction", e.target.value)}
                  className="occupants-form-input"
                  placeholder="Ex: Enseignant"
                />
              </div>
            </div>
          </div>

          <div className="occupants-form-actions">
            <button type="button" className="occupants-btn-cancel" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="occupants-btn-submit" disabled={saving}>
              {saving
                ? "Enregistrement..."
                : mode === "create"
                ? "Créer l'occupant"
                : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ───────────────── Modal détail ───────────────── */
function OccupantDetailModal({
  occupant,
  onClose,
  onEdit,
  onDelete,
}: {
  occupant: Occupant;
  onClose: () => void;
  onEdit: (o: Occupant) => void;
  onDelete: (o: Occupant) => void;
}) {
  const initials = `${occupant.prenom?.[0] || ""}${occupant.nom?.[0] || ""}`.toUpperCase();

  return (
    <div className="occupants-modal-overlay" onClick={onClose}>
      <div className="occupants-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="occupants-detail-header">
          <button className="occupants-detail-close" onClick={onClose}>
            ×
          </button>
          <div className="occupants-detail-avatar">{initials}</div>
          <h2>
            {occupant.prenom} {occupant.nom}
          </h2>
          <p>
            {occupant.fonction || "—"} · {occupant.matricule}
          </p>
        </div>

        <div className="occupants-detail-body">
          <div className="occupants-detail-infos">
            <InfoRow label="Matricule" value={occupant.matricule} />
            {occupant.cin && <InfoRow label="CIN" value={occupant.cin} />}
            {occupant.telephone && <InfoRow label="Téléphone" value={occupant.telephone} />}
            {occupant.email && <InfoRow label="Email" value={occupant.email} />}
            {occupant.ministere && <InfoRow label="Ministère" value={occupant.ministere} />}
            {occupant.codeMinistere && (
              <InfoRow label="Code Ministère" value={occupant.codeMinistere} />
            )}
            {occupant.fonction && <InfoRow label="Fonction" value={occupant.fonction} />}
          </div>

          <div className="occupants-detail-actions">
            <button className="occupants-btn-secondary" onClick={() => onEdit(occupant)}>
              ✎ Modifier
            </button>
            <button className="occupants-btn-danger" onClick={() => onDelete(occupant)}>
              🗑 Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="occupants-info-row">
      <span className="occupants-info-label">{label}</span>
      <span className="occupants-info-value">{value}</span>
    </div>
  );
}

/* ───────────────── Page principale ───────────────── */
export default function OccupantsPage() {
  const { toast, confirmAction } = useFeedback();

  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtreMinistere, setFiltreMinistere] = useState<string>("TOUS");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOccupant, setSelectedOccupant] = useState<Occupant | null>(null);
  const [editingOccupant, setEditingOccupant] = useState<Occupant | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadOccupants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Charge tout ; filtres appliqués côté client (ou passe search/ministere si tu veux côté API)
      const list = await occupantsApi.getAll();
      setOccupants(list);
    } catch (e: any) {
      setError(e.message || "Impossible de charger les occupants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOccupants();
  }, [loadOccupants]);

  const ministeres = useMemo(() => {
    const set = new Set(
      occupants.map((o) => o.ministere).filter(Boolean) as string[]
    );
    return Array.from(set).sort();
  }, [occupants]);

  const occupantsFiltres = useMemo(() => {
    return occupants.filter((o) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search.trim() ||
        o.nom.toLowerCase().includes(q) ||
        o.prenom.toLowerCase().includes(q) ||
        o.matricule.toLowerCase().includes(q) ||
        (o.fonction || "").toLowerCase().includes(q) ||
        (o.ministere || "").toLowerCase().includes(q) ||
        (o.cin || "").toLowerCase().includes(q);

      const matchMinistere =
        filtreMinistere === "TOUS" || o.ministere === filtreMinistere;

      return matchSearch && matchMinistere;
    });
  }, [occupants, search, filtreMinistere]);

  const totalPages = Math.max(1, Math.ceil(occupantsFiltres.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentOccupants = occupantsFiltres.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleMinistereChange = (value: string) => {
    setFiltreMinistere(value);
    setCurrentPage(1);
  };

  const handleEdit = (o: Occupant) => {
    setSelectedOccupant(null);
    setEditingOccupant(o);
  };

  const handleSaveEdit = async (updated: Occupant) => {
    try {
      const saved = await occupantsApi.update(updated.occupanId, updated);
      setOccupants((prev) =>
        prev.map((o) => (o.occupanId === saved.occupanId ? saved : o))
      );
      setEditingOccupant(null);
      setSelectedOccupant(null);
    } catch (e: any) {
      toast.error("Échec de la modification", e.message || "Une erreur est survenue lors de la modification de l'occupant.");
      throw e;
    }
  };

  const handleCreate = async (newOccupant: Occupant) => {
    try {
      const created = await occupantsApi.create(newOccupant);
      setOccupants((prev) => [created, ...prev]);
      setShowCreateForm(false);
      setCurrentPage(1);
    } catch (e: any) {
      toast.error("Échec de la création", e.message || "Une erreur est survenue lors de la création de l'occupant.");
      throw e;
    }
  };

  const handleDelete = async (o: Occupant) => {
    if (
      !(await confirmAction({
        title: "Confirmer la suppression",
        message: `Vous êtes sur le point de supprimer définitivement l'occupant « ${o.prenom} ${o.nom} ». Cette action est irréversible.`,
        confirmLabel: "Supprimer",
        type: "warning",
      }))
    ) {
      return;
    }
    try {
      await occupantsApi.remove(o.occupanId);
      setOccupants((prev) => prev.filter((x) => x.occupanId !== o.occupanId));
      setSelectedOccupant(null);
      setEditingOccupant(null);
      toast.success("Occupant supprimé", `L'occupant ${o.prenom} ${o.nom} a été supprimé avec succès.`);
    } catch (e: any) {
      toast.error("Échec de la suppression", e.message || "Une erreur est survenue lors de la suppression de l'occupant.");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: C.muted, fontSize: 14 }}>
        Chargement des occupants…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: C.red, marginBottom: 12 }}>{error}</p>
        <button
          onClick={loadOccupants}
          style={{
            background: C.gold,
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="occupants-page">
      <div className="occupants-header">
        <div>
          <h2>Gestion des Occupants</h2>
          <p>
            {occupantsFiltres.length} occupant
            {occupantsFiltres.length > 1 ? "s" : ""} trouvé
            {occupantsFiltres.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          className="occupants-btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          + Nouvel occupant
        </button>
      </div>

      <div className="occupants-filters">
        <div className="occupants-search">
          <svg
            width="15"
            height="15"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#94a3b8"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom, matricule, fonction..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <select
          className="occupants-select"
          value={filtreMinistere}
          onChange={(e) => handleMinistereChange(e.target.value)}
        >
          <option value="TOUS">Tous les ministères</option>
          {ministeres.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {currentOccupants.length === 0 ? (
        <div className="occupants-empty">
          Aucun occupant ne correspond à votre recherche.
        </div>
      ) : (
        <>
          <div className="occupants-table-wrap">
            <table className="occupants-table">
              <thead>
                <tr>
                  <th>Occupant</th>
                  <th>Matricule</th>
                  <th>Fonction</th>
                  <th>Ministère</th>
                  <th>Téléphone</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {currentOccupants.map((o) => {
                  const initials = `${o.prenom?.[0] || ""}${o.nom?.[0] || ""}`.toUpperCase();
                  return (
                    <tr key={o.occupanId} onClick={() => setSelectedOccupant(o)}>
                      <td>
                        <div className="occupants-td-identity">
                          <div className="occupants-avatar-sm">{initials}</div>
                          <span className="occupants-td-name">
                            {o.prenom} {o.nom}
                          </span>
                        </div>
                      </td>
                      <td className="occupants-td-muted">{o.matricule}</td>
                      <td>{o.fonction || "—"}</td>
                      <td className="occupants-td-muted">{o.ministere || "—"}</td>
                      <td className="occupants-td-muted">{o.telephone || "—"}</td>
                      <td className="occupants-td-muted">{o.email || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="occupants-pagination">
              <button
                className="occupants-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`occupants-page-num${page === currentPage ? " active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="occupants-page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant →
              </button>
            </div>
          )}

          <div className="occupants-pagination-info">
            Page {currentPage} sur {totalPages} — Affichage de{" "}
            {occupantsFiltres.length === 0 ? 0 : startIndex + 1} à{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, occupantsFiltres.length)} sur{" "}
            {occupantsFiltres.length}
          </div>
        </>
      )}

      {selectedOccupant && (
        <OccupantDetailModal
          occupant={selectedOccupant}
          onClose={() => setSelectedOccupant(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {editingOccupant && (
        <OccupantForm
          mode="edit"
          occupant={editingOccupant}
          onClose={() => setEditingOccupant(null)}
          onSave={handleSaveEdit}
        />
      )}

      {showCreateForm && (
        <OccupantForm
          mode="create"
          onClose={() => setShowCreateForm(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}