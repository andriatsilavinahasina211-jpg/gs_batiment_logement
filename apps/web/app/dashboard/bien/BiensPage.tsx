"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { C } from "../shared/constants";
import { Ic } from "../shared/icons";

/* ───────────────── Config API NestJS ───────────────── */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ───────────────── Types ───────────────── */
type TypeBien =
  | "HOTEL_MINISTERIEL"
  | "LOGEMENT_FONCTION"
  | "SOCIAL_ECONOMIQUE"
  | "BUREAU";
type NatureBien = "BUREAU" | "LOGEMENT" | "BUREAU_LOGEMENT";
type StatutBien = "LIBRE" | "OCCUPE" | "EN_LIBERATION" | "EN_TRAVAUX";
type EtatBatisse = "BON" | "MOYEN" | "MAUVAIS";

interface Bien {
  numeroBien: string;
  nomDuBien: string;
  typeBien: TypeBien;
  utilisateurDuBien?: string;
  nature?: NatureBien;
  adresse: string;
  localite: string;
  etatBatisse: EtatBatisse;
  statut: StatutBien;
  photos: string[];
  description?: string;
}

/* ───────────────── Helpers API ───────────────── */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
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
    if (Array.isArray(obj.biens)) return obj.biens;
    if (Array.isArray(obj.results)) return obj.results;
    if (Array.isArray(obj.records)) return obj.records;
  }
  console.warn("Format API /dashboard/biens inattendu:", payload);
  return [];
}

function normalizeBien(b: any): Bien {
  return {
    numeroBien: b.numeroBien ?? b.id ?? "",
    nomDuBien: b.nomDuBien ?? b.nom ?? "",
    typeBien: b.typeBien,
    utilisateurDuBien: b.utilisateurDuBien ?? undefined,
    nature: b.nature ?? undefined,
    adresse: b.adresse ?? "",
    localite: b.localite ?? "",
    etatBatisse: b.etatBatisse,
    statut: b.statut,
    photos: Array.isArray(b.photos)
      ? b.photos
      : typeof b.photos === "string"
        ? (() => {
            try {
              const p = JSON.parse(b.photos);
              return Array.isArray(p) ? p : [];
            } catch {
              return b.photos ? [b.photos] : [];
            }
          })()
        : [],
    description: b.description ?? undefined,
  };
}

/** Nettoie le payload — n'envoie PAS numeroBien à la création */
function cleanPayload(
  data: Partial<Bien>,
  isCreate = false
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (!isCreate && data.numeroBien?.trim()) {
    payload.numeroBien = data.numeroBien.trim().toUpperCase();
  }

  if (data.nomDuBien?.trim()) payload.nomDuBien = data.nomDuBien.trim();
  if (data.typeBien) payload.typeBien = data.typeBien;
  if (data.nature) payload.nature = data.nature;
  if (data.adresse?.trim()) payload.adresse = data.adresse.trim();
  if (data.localite?.trim()) payload.localite = data.localite.trim();
  if (data.etatBatisse) payload.etatBatisse = data.etatBatisse;
  if (data.statut) payload.statut = data.statut;
  if (data.description?.trim()) payload.description = data.description.trim();
  if (data.utilisateurDuBien?.trim()) {
    payload.utilisateurDuBien = data.utilisateurDuBien.trim();
  }

  // Uniquement les vraies URLs (jamais de base64)
  if (Array.isArray(data.photos) && data.photos.length > 0) {
    const realUrls = data.photos.filter((p) => p && !p.startsWith("data:"));
    if (realUrls.length > 0) {
      payload.photos = realUrls;
    }
  }

  return payload;
}

const biensApi = {
  getAll: async (): Promise<Bien[]> => {
    const raw = await apiFetch<unknown>("/dashboard/biens");
    return extractList(raw).map(normalizeBien);
  },

  create: async (data: Bien): Promise<Bien> => {
    const payload = cleanPayload(data, true);
    console.log("POST /dashboard/biens →", payload);

    const raw = await apiFetch<any>("/dashboard/biens", {
      method: "POST",
      body: JSON.stringify(payload), // JSON uniquement
    });
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeBien(item);
  },

  update: async (numeroBien: string, data: Partial<Bien>): Promise<Bien> => {
    const payload = cleanPayload(data, false);
    delete payload.numeroBien;

    const raw = await apiFetch<any>(
      `/dashboard/biens/${encodeURIComponent(numeroBien)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
    const item = raw?.data && !Array.isArray(raw.data) ? raw.data : raw;
    return normalizeBien(item);
  },

  remove: (numeroBien: string) =>
    apiFetch<void>(`/dashboard/biens/${encodeURIComponent(numeroBien)}`, {
      method: "DELETE",
    }),

  /** Upload photo → retourne l'URL publique */
  uploadPhoto: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const token = getAuthToken();

    const res = await fetch(`${API_URL}/dashboard/biens/upload`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // PAS de Content-Type → le navigateur met multipart/form-data
      },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.message || body.error || "Erreur lors de l'upload de l'image"
      );
    }

    const data = await res.json();
    return data.url as string;
  },
};

/* ───────────────── Notifications globales ───────────────── */
type ToastType = "success" | "error";
type ToastPayload = { type: ToastType; message: string; title?: string };
const TOAST_EVENT = "biens:toast";

/** Affiche une notification depuis n'importe quel composant de la page */
function notify(type: ToastType, message: string, title?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: { type, message, title } }));
}

/* ───────────────── Helpers UI ───────────────── */
const statutConfig: Record<
  StatutBien,
  { label: string; color: string; bg: string }
> = {
  LIBRE: { label: "Libre", color: C.green, bg: C.greenBg },
  OCCUPE: { label: "Occupé", color: C.goldDark, bg: C.goldBg },
  EN_LIBERATION: { label: "En libération", color: "#d97706", bg: "#fffbeb" },
  EN_TRAVAUX: { label: "En travaux", color: C.red, bg: C.redBg },
};

const etatConfig: Record<EtatBatisse, { label: string; color: string }> = {
  BON: { label: "Bon", color: C.green },
  MOYEN: { label: "Moyen", color: "#d97706" },
  MAUVAIS: { label: "Mauvais", color: C.red },
};

const typeLabel: Record<TypeBien, string> = {
  HOTEL_MINISTERIEL: "Hôtel ministériel",
  LOGEMENT_FONCTION: "Logement de fonction",
  SOCIAL_ECONOMIQUE: "Social / Économique",
  BUREAU: "Bureau",
};

const ITEMS_PER_PAGE = 10;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.bg,
  fontSize: 13.5,
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 600,
  color: C.muted,
  marginBottom: 5,
};

/* ───────────────── Upload Image ───────────────── */
function ImageUpload({
  value,
  onChange,
  onFileSelect,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  onFileSelect: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify("error", "Format non pris en charge. Veuillez sélectionner une image au format JPG, PNG ou WEBP.", "Fichier invalide");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify("error", "La taille de l'image dépasse la limite autorisée de 5 Mo. Veuillez choisir un fichier plus léger.", "Fichier trop volumineux");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);

    onFileSelect(file);
  };

  const handleRemove = () => {
    onChange(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <label style={labelStyle}>Photo du bien</label>
      {value ? (
        <div
          style={{
            position: "relative",
            borderRadius: 10,
            overflow: "hidden",
            border: `1px solid ${C.border}`,
          }}
        >
          <img
            src={value}
            alt="Aperçu"
            style={{
              width: "100%",
              height: 160,
              objectFit: "cover",
              display: "block",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "8px 12px",
              background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "none",
                background: "rgba(255,255,255,0.9)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Changer
            </button>
            <button
              type="button"
              onClick={handleRemove}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "none",
                background: C.redBg,
                color: C.red,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${C.border}`,
            borderRadius: 10,
            padding: "28px 16px",
            textAlign: "center",
            cursor: "pointer",
            background: C.bg,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.gold)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
            Cliquez pour ajouter une photo
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            JPG, PNG ou WEBP — max 5 Mo
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        style={{ display: "none" }}
      />
    </div>
  );
}

/* ───────────────── Formulaire ───────────────── */
function BienForm({
  mode,
  bien,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  bien?: Bien;
  onClose: () => void;
  onSave: (data: Bien) => void | Promise<void>;
}) {
  const emptyForm: Bien = {
    numeroBien: "",
    nomDuBien: "",
    typeBien: "LOGEMENT_FONCTION",
    utilisateurDuBien: "",
    nature: "LOGEMENT",
    adresse: "",
    localite: "",
    etatBatisse: "BON",
    statut: "LIBRE",
    photos: [],
    description: "",
  };

  const [form, setForm] = useState<Bien>(
    mode === "edit" && bien ? { ...bien } : emptyForm
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof Bien, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nomDuBien.trim() || !form.adresse.trim() || !form.localite.trim()) {
      notify("error", "Veuillez renseigner tous les champs obligatoires avant d'enregistrer.", "Formulaire incomplet");
      return;
    }

    setSaving(true);
    try {
      // Photos déjà en URL (édition) ou vides
      let finalPhotos = (form.photos || []).filter(
        (p) => p && !p.startsWith("data:")
      );

      // Nouveau fichier → upload d'abord
      if (selectedFile) {
        const url = await biensApi.uploadPhoto(selectedFile);
        finalPhotos = [url];
      }

      // Puis création / update en JSON
      await onSave({
        ...form,
        photos: finalPhotos,
      });
    } catch (err: any) {
      notify("error", err.message || "Une erreur est survenue lors de l'enregistrement du bien.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          width: "100%",
          maxWidth: 560,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          border: `1px solid ${C.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}
            >
              {mode === "create" ? "Ajouter un bien" : "Modifier le bien"}
            </h2>
            {mode === "edit" && (
              <p style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
                {bien?.numeroBien}
              </p>
            )}
            {mode === "create" && (
              <p style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
                Le N° d’inventaire sera généré automatiquement
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: `1px solid ${C.border}`,
              background: C.bg,
              fontSize: 18,
              cursor: "pointer",
              color: C.muted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ImageUpload
              value={form.photos?.[0] || null}
              onChange={(url) =>
                setForm((prev) => ({ ...prev, photos: url ? [url] : [] }))
              }
              onFileSelect={(file) => setSelectedFile(file)}
            />

            <div>
              <label style={labelStyle}>Nom du bien *</label>
              <input
                type="text"
                required
                value={form.nomDuBien}
                onChange={(e) => handleChange("nomDuBien", e.target.value)}
                style={inputStyle}
                placeholder="Ex: Logement de fonction B-12"
              />
            </div>

            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
            >
              <div>
                <label style={labelStyle}>Type de bien *</label>
                <select
                  required
                  value={form.typeBien}
                  onChange={(e) => handleChange("typeBien", e.target.value)}
                  style={inputStyle}
                >
                  <option value="LOGEMENT_FONCTION">Logement de fonction</option>
                  <option value="BUREAU">Bureau</option>
                  <option value="HOTEL_MINISTERIEL">Hôtel ministériel</option>
                  <option value="SOCIAL_ECONOMIQUE">Social / Économique</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Nature</label>
                <select
                  value={form.nature || ""}
                  onChange={(e) => handleChange("nature", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">— Non défini —</option>
                  <option value="LOGEMENT">Logement</option>
                  <option value="BUREAU">Bureau</option>
                  <option value="BUREAU_LOGEMENT">Bureau-Logement</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Adresse *</label>
              <input
                type="text"
                required
                value={form.adresse}
                onChange={(e) => handleChange("adresse", e.target.value)}
                style={inputStyle}
                placeholder="Ex: Lot II M 45, Centre-ville"
              />
            </div>

            <div>
              <label style={labelStyle}>Localité *</label>
              <input
                type="text"
                required
                value={form.localite}
                onChange={(e) => handleChange("localite", e.target.value)}
                style={inputStyle}
                placeholder="Ex: Fianarantsoa - Centre-ville"
              />
            </div>

            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
            >
              <div>
                <label style={labelStyle}>Statut *</label>
                <select
                  required
                  value={form.statut}
                  onChange={(e) => handleChange("statut", e.target.value)}
                  style={inputStyle}
                >
                  <option value="LIBRE">Libre</option>
                  <option value="OCCUPE">Occupé</option>
                  <option value="EN_LIBERATION">En libération</option>
                  <option value="EN_TRAVAUX">En travaux</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>État du bâtiment *</label>
                <select
                  required
                  value={form.etatBatisse}
                  onChange={(e) => handleChange("etatBatisse", e.target.value)}
                  style={inputStyle}
                >
                  <option value="BON">Bon</option>
                  <option value="MOYEN">Moyen</option>
                  <option value="MAUVAIS">Mauvais</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Occupant actuel</label>
              <input
                type="text"
                value={form.utilisateurDuBien || ""}
                onChange={(e) =>
                  handleChange("utilisateurDuBien", e.target.value)
                }
                style={inputStyle}
                placeholder="Nom de l'occupant (optionnel)"
              />
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={form.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                placeholder="Description du bien..."
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 24,
              paddingTop: 20,
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "11px 16px",
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: C.bg,
                color: C.text,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: "11px 16px",
                borderRadius: 8,
                border: "none",
                background: saving ? C.muted : C.gold,
                color: "white",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving
                ? "Enregistrement..."
                : mode === "create"
                  ? "Créer le bien"
                  : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ───────────────── Modal détail ───────────────── */
function BienDetailModal({
  bien,
  onClose,
  onEdit,
  onDelete,
}: {
  bien: Bien;
  onClose: () => void;
  onEdit: (bien: Bien) => void;
  onDelete: (bien: Bien) => void;
}) {
  const st = statutConfig[bien.statut] || statutConfig.LIBRE;
  const et = etatConfig[bien.etatBatisse] || etatConfig.BON;
  const photo = bien.photos?.[0] || null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          border: `1px solid ${C.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            height: 200,
            background: "#e2e8f0",
            position: "relative",
            borderRadius: "16px 16px 0 0",
            overflow: "hidden",
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt={bien.nomDuBien}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.muted,
              }}
            >
              <Ic.Biens />
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.9)",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            ×
          </button>
          <span
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 12px",
              borderRadius: 6,
              background: st.bg,
              color: st.color,
            }}
          >
            {st.label}
          </span>
        </div>

        <div style={{ padding: "20px 24px 24px" }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
            {bien.numeroBien}
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: C.text,
              margin: "0 0 16px 0",
            }}
          >
            {bien.nomDuBien}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <InfoRow label="Localité" value={bien.localite} />
            <InfoRow label="Adresse" value={bien.adresse} />
            <InfoRow
              label="Type"
              value={typeLabel[bien.typeBien] || bien.typeBien}
            />
            {bien.nature && (
              <InfoRow
                label="Nature"
                value={String(bien.nature).replace("_", " ")}
              />
            )}
            <InfoRow
              label="État du bâtiment"
              value={et.label}
              valueColor={et.color}
            />
            {bien.utilisateurDuBien && (
              <InfoRow label="Occupant actuel" value={bien.utilisateurDuBien} />
            )}
            {bien.description && (
              <div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                  Description
                </div>
                <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.5 }}>
                  {bien.description}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 24,
              paddingTop: 20,
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <button
              onClick={() => onEdit(bien)}
              style={{
                flex: 1,
                padding: "11px 16px",
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: C.bg,
                color: C.text,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✎ Modifier
            </button>
            <button
              onClick={() => onDelete(bien)}
              style={{
                flex: 1,
                padding: "11px 16px",
                borderRadius: 8,
                border: "none",
                background: C.redBg,
                color: C.red,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🗑 Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 12.5, color: C.muted }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: valueColor || C.text,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ───────────────── Page principale ───────────────── */
/* ───────────────── Boîte de confirmation ───────────────── */
function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  loading = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      role="presentation"
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440, background: C.card, borderRadius: 14,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)", overflow: "hidden",
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ padding: "24px 24px 8px", display: "flex", gap: 16 }}>
          <div
            style={{
              flexShrink: 0, width: 44, height: 44, borderRadius: "50%",
              background: C.redBg, color: C.red, display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700,
            }}
          >
            !
          </div>
          <div>
            <h3 id="confirm-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>
              {title}
            </h3>
            <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.55, color: C.muted }}>
              {message}
            </p>
          </div>
        </div>
        <div
          style={{
            display: "flex", justifyContent: "flex-end", gap: 10,
            padding: "16px 24px", marginTop: 12, background: C.bg,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "9px 18px", borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.card, color: C.text, fontSize: 13.5, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            autoFocus
            style={{
              padding: "9px 18px", borderRadius: 8, border: "none",
              background: C.red, color: "#fff", fontSize: 13.5, fontWeight: 600,
              cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Suppression…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Notification (toast) ───────────────── */
function Toast({
  type,
  title,
  message,
  onClose,
}: {
  type: ToastType;
  title?: string;
  message: string;
  onClose: () => void;
}) {
  const color = type === "success" ? C.green : C.red;
  const bg = type === "success" ? C.greenBg : C.redBg;
  return (
    <div
      role="status"
      style={{
        position: "fixed", top: 24, right: 24, zIndex: 3000, maxWidth: 380,
        display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
        background: C.card, borderRadius: 10, borderLeft: `4px solid ${color}`,
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
      }}
    >
      <div
        style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: bg,
          color, display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 14,
        }}
      >
        {type === "success" ? "✓" : "!"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>
          {title || (type === "success" ? "Opération réussie" : "Échec de l'opération")}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>{message}</div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        style={{ border: "none", background: "transparent", color: C.muted, cursor: "pointer", fontSize: 16 }}
      >
        ×
      </button>
    </div>
  );
}

export default function BiensPage() {
  const [biens, setBiens] = useState<Bien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("TOUS");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBien, setSelectedBien] = useState<Bien | null>(null);
  const [editingBien, setEditingBien] = useState<Bien | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadBiens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await biensApi.getAll();
      setBiens(list);
    } catch (e: any) {
      setError(e.message || "Impossible de charger les biens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBiens();
  }, [loadBiens]);

  const biensFiltres = useMemo(() => {
    return biens.filter((b) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search.trim() ||
        b.nomDuBien?.toLowerCase().includes(q) ||
        b.numeroBien?.toLowerCase().includes(q) ||
        b.localite?.toLowerCase().includes(q) ||
        b.adresse?.toLowerCase().includes(q);
      const matchStatut = filtreStatut === "TOUS" || b.statut === filtreStatut;
      return matchSearch && matchStatut;
    });
  }, [biens, search, filtreStatut]);

  const totalPages = Math.max(
    1,
    Math.ceil(biensFiltres.length / ITEMS_PER_PAGE)
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentBiens = biensFiltres.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handleEdit = (bien: Bien) => {
    setSelectedBien(null);
    setEditingBien(bien);
  };

  const handleSaveEdit = async (updated: Bien) => {
    try {
      const saved = await biensApi.update(updated.numeroBien, updated);
      setBiens((prev) =>
        prev.map((b) => (b.numeroBien === saved.numeroBien ? saved : b))
      );
      setEditingBien(null);
      setSelectedBien(saved);
    } catch (e: any) {
      notify("error", e.message || "Une erreur est survenue lors de la modification du bien.");
      throw e;
    }
  };

  const handleCreate = async (newBien: Bien) => {
    try {
      const created = await biensApi.create(newBien);
      setBiens((prev) => [created, ...prev]);
      setShowCreateForm(false);
      setCurrentPage(1);
    } catch (e: any) {
      notify("error", e.message || "Une erreur est survenue lors de la création du bien.");
      throw e;
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<Bien | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    const onToast = (e: Event) => setToast((e as CustomEvent<ToastPayload>).detail);
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleDelete = (bien: Bien) => {
    setDeleteTarget(bien);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await biensApi.remove(deleteTarget.numeroBien);
      setBiens((prev) => prev.filter((b) => b.numeroBien !== deleteTarget.numeroBien));
      setSelectedBien(null);
      setToast({ type: "success", message: `Le bien « ${deleteTarget.nomDuBien} » a été supprimé avec succès.` });
      setDeleteTarget(null);
    } catch (e: any) {
      setToast({ type: "error", message: e.message || "Une erreur est survenue lors de la suppression." });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 48,
          textAlign: "center",
          color: C.muted,
          fontSize: 14,
        }}
      >
        Chargement des biens…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: C.red, marginBottom: 12 }}>{error}</p>
        <button
          onClick={loadBiens}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          background: C.card,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          padding: "16px 20px",
          boxShadow: "0 1px 4px rgba(0,0,0,.04)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}
          >
            Gestion des Biens
          </h2>
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
            {biensFiltres.length} bien{biensFiltres.length > 1 ? "s" : ""} trouvé
            {biensFiltres.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            background: C.gold,
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          + Ajouter un bien
        </button>
      </div>

      <div
        style={{
          background: C.card,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          padding: "12px 16px",
          boxShadow: "0 1px 4px rgba(0,0,0,.04)",
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 200,
            display: "flex",
            alignItems: "center",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "0 10px",
          }}
        >
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
            placeholder="Rechercher par n°, nom, localité..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              padding: "9px 8px",
              fontSize: 13,
              background: "transparent",
              color: C.text,
            }}
          />
        </div>
        <select
          value={filtreStatut}
          onChange={(e) => {
            setFiltreStatut(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: "9px 12px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: C.bg,
            fontSize: 13,
            color: C.text,
            minWidth: 150,
          }}
        >
          <option value="TOUS">Tous les statuts</option>
          <option value="LIBRE">Libre</option>
          <option value="OCCUPE">Occupé</option>
          <option value="EN_LIBERATION">En libération</option>
          <option value="EN_TRAVAUX">En travaux</option>
        </select>
      </div>

      {currentBiens.length === 0 ? (
        <div
          style={{
            background: C.card,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            padding: "50px 20px",
            textAlign: "center",
            color: C.muted,
          }}
        >
          Aucun bien ne correspond à votre recherche.
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {currentBiens.map((bien) => {
              const st = statutConfig[bien.statut] || statutConfig.LIBRE;
              const et = etatConfig[bien.etatBatisse] || etatConfig.BON;
              const photo = bien.photos?.[0] || null;
              return (
                <div
                  key={bien.numeroBien}
                  onClick={() => setSelectedBien(bien)}
                  style={{
                    background: C.card,
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                    transition: "box-shadow 0.2s, transform 0.15s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 4px 14px rgba(0,0,0,.1)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 1px 3px rgba(0,0,0,.04)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      height: 110,
                      background: "#e2e8f0",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {photo ? (
                      <img
                        src={photo}
                        alt={bien.nomDuBien}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: C.muted,
                        }}
                      >
                        <Ic.Biens />
                      </div>
                    )}
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 5,
                        background: st.bg,
                        color: st.color,
                      }}
                    >
                      {st.label}
                    </span>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: C.muted,
                        marginBottom: 2,
                      }}
                    >
                      {bien.numeroBien}
                    </div>
                    <h4
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.text,
                        margin: "0 0 6px 0",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {bien.nomDuBien}
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11.5,
                          color: C.text,
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke={C.muted}
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {bien.localite}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {typeLabel[bien.typeBien] || bien.typeBien}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        État :{" "}
                        <span style={{ fontWeight: 600, color: et.color }}>
                          {et.label}
                        </span><br />
                        Statut :{" "}
                        <span style={{ fontWeight: 600, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                      {bien.utilisateurDuBien && (
                        <div
                          style={{
                            marginTop: 5,
                            paddingTop: 5,
                            borderTop: `1px solid ${C.border}`,
                            fontSize: 11,
                            color: C.muted,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          Occupant :{" "}
                          <span style={{ color: C.text, fontWeight: 600 }}>
                            {bien.utilisateurDuBien}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                marginTop: 4,
              }}
            >
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: currentPage === 1 ? C.bg : C.card,
                  color: currentPage === 1 ? C.muted : C.text,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  opacity: currentPage === 1 ? 0.6 : 1,
                }}
              >
                ← Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: `1px solid ${
                        page === currentPage ? C.gold : C.border
                      }`,
                      background: page === currentPage ? C.gold : C.card,
                      color: page === currentPage ? "white" : C.text,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: currentPage === totalPages ? C.bg : C.card,
                  color: currentPage === totalPages ? C.muted : C.text,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                  opacity: currentPage === totalPages ? 0.6 : 1,
                }}
              >
                Suivant →
              </button>
            </div>
          )}

          <div style={{ textAlign: "center", fontSize: 12, color: C.muted }}>
            Page {currentPage} sur {totalPages} — Affichage de{" "}
            {biensFiltres.length === 0 ? 0 : startIndex + 1} à{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, biensFiltres.length)} sur{" "}
            {biensFiltres.length}
          </div>
        </>
      )}

      {selectedBien && (
        <BienDetailModal
          bien={selectedBien}
          onClose={() => setSelectedBien(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {editingBien && (
        <BienForm
          mode="edit"
          bien={editingBien}
          onClose={() => setEditingBien(null)}
          onSave={handleSaveEdit}
        />
      )}

      {showCreateForm && (
        <BienForm
          mode="create"
          onClose={() => setShowCreateForm(false)}
          onSave={handleCreate}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Confirmer la suppression"
          message={
            <>
              Vous êtes sur le point de supprimer définitivement le bien{" "}
              <strong style={{ color: C.text }}>« {deleteTarget.nomDuBien} »</strong>{" "}
              (réf. {deleteTarget.numeroBien}).
              <br />
              Cette action est irréversible.
            </>
          }
          confirmLabel="Supprimer"
          loading={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {toast && <Toast key={toast.message} type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}