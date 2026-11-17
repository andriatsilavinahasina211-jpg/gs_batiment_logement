"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import type { Bail } from "../types";
import { statutConfig } from "../constants";
import { useFeedback } from "../../shared/feedback";

type BailFormProps = {
  mode: "create" | "edit";
  bail?: Bail;
  onClose: () => void;
  onSave: (data: Bail) => void;
};

type BienOption = {
  numeroBien: string;
  nomDuBien: string;
  localite?: string;
  statut?: string;
};

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

async function fetchBiens(): Promise<BienOption[]> {
  const res = await fetch(`${API_URL}/dashboard/biens`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Impossible de charger les biens");
  const raw = await res.json();
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.biens)
        ? raw.biens
        : Array.isArray(raw?.items)
          ? raw.items
          : [];
  return list.map((b: any) => ({
    numeroBien: b.numeroBien ?? "",
    nomDuBien: b.nomDuBien ?? b.nom ?? "",
    localite: b.localite ?? "",
    statut: b.statut ?? "",
  }));
}

const emptyForm: Bail = {
  numeroBail: "",
  dateDebut: "",
  dateFin: "",
  montantLoyer: undefined,
  statut: "EN_ATTENTE_MEF",
  accordMef: false,
  visaCf: false,
  approbationSrb: false,
  enregistreFiscal: false,
  bienNumero: "",
  bienNom: "",
  locataireId: undefined,
  locataireNom: "",
  nomBailleur: "",
  nifBailleur: "",
  statBailleur: "",
  ribBailleur: "",
  demandeReference: "",
};

export function BailForm({ mode, bail, onClose, onSave }: BailFormProps) {
  const { toast } = useFeedback();
  const [form, setForm] = useState<Bail>(
    mode === "edit" && bail ? { ...bail } : emptyForm
  );
  const [saving, setSaving] = useState(false);

  // ── Bien searchable ──
  const [biens, setBiens] = useState<BienOption[]>([]);
  const [biensLoading, setBiensLoading] = useState(true);
  const [bienQuery, setBienQuery] = useState(
    mode === "edit" && bail
      ? `${bail.bienNumero}${bail.bienNom ? ` — ${bail.bienNom}` : ""}`
      : ""
  );
  const [bienOpen, setBienOpen] = useState(false);
  const bienRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchBiens();
        if (!cancelled) setBiens(list);
      } catch {
        if (!cancelled) setBiens([]);
      } finally {
        if (!cancelled) setBiensLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fermer la liste au clic extérieur
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (bienRef.current && !bienRef.current.contains(e.target as Node)) {
        setBienOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filteredBiens = useMemo(() => {
    const q = bienQuery.toLowerCase().trim();
    // En création : privilégier les biens LIBRE
    let pool = biens;
    if (mode === "create") {
      const libres = biens.filter((b) => b.statut === "LIBRE");
      pool = libres.length > 0 ? libres : biens;
    }
    if (!q) return pool.slice(0, 30);
    return pool
      .filter(
        (b) =>
          b.numeroBien.toLowerCase().includes(q) ||
          b.nomDuBien.toLowerCase().includes(q) ||
          (b.localite || "").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [biens, bienQuery, mode]);

  const selectBien = (b: BienOption) => {
    setForm((prev) => ({
      ...prev,
      bienNumero: b.numeroBien,
      bienNom: b.nomDuBien,
    }));
    setBienQuery(`${b.numeroBien}${b.nomDuBien ? ` — ${b.nomDuBien}` : ""}`);
    setBienOpen(false);
  };

  const handleChange = (
    field: keyof Bail,
    value: string | boolean | number | undefined
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dateDebut || !form.dateFin || !form.bienNumero.trim()) {
      toast.warning("Informations manquantes", "Les dates et le numéro du bien sont obligatoires.");
      return;
    }
    if (!form.locataireId || form.locataireId <= 0) {
      toast.warning("Locataire manquant", "Le locataire est obligatoire.");
      return;
    }
    setSaving(true);
    try {
      onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="baux-modal-overlay form" onClick={onClose}>
      <div className="baux-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="baux-form-header">
          <div>
            <h2>{mode === "create" ? "Nouveau bail" : "Modifier le bail"}</h2>
            {mode === "edit" && <p>{bail?.numeroBail}</p>}
            {mode === "create" && (
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                Le n° de bail sera généré automatiquement
              </p>
            )}
          </div>
          <button type="button" className="baux-form-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="baux-form-body">
          <div className="baux-form-fields">
            {mode === "edit" && (
              <div>
                <label className="baux-form-label">N° Bail</label>
                <input
                  type="text"
                  disabled
                  value={form.numeroBail}
                  className="baux-form-input"
                />
              </div>
            )}

            {/* ── Bien searchable ── */}
            <div ref={bienRef} style={{ position: "relative" }}>
              <label className="baux-form-label">Bien *</label>
              <input
                type="text"
                required
                autoComplete="off"
                value={bienQuery}
                disabled={biensLoading}
                placeholder={
                  biensLoading
                    ? "Chargement des biens…"
                    : "Rechercher par n°, nom, localité…"
                }
                className="baux-form-input"
                onChange={(e) => {
                  setBienQuery(e.target.value);
                  setBienOpen(true);
                  if (!e.target.value.trim()) {
                    setForm((prev) => ({
                      ...prev,
                      bienNumero: "",
                      bienNom: "",
                    }));
                  }
                }}
                onFocus={() => setBienOpen(true)}
              />
              {form.bienNumero && (
                <p style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  Sélectionné : <strong>{form.bienNumero}</strong>
                  {form.bienNom ? ` — ${form.bienNom}` : ""}
                </p>
              )}

              {bienOpen && !biensLoading && (
                <ul
                  style={{
                    position: "absolute",
                    zIndex: 50,
                    left: 0,
                    right: 0,
                    maxHeight: 220,
                    overflowY: "auto",
                    margin: "4px 0 0",
                    padding: 0,
                    listStyle: "none",
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    boxShadow: "0 8px 24px rgba(0,0,0,.08)",
                  }}
                >
                  {filteredBiens.length === 0 ? (
                    <li
                      style={{
                        padding: "10px 12px",
                        fontSize: 13,
                        color: "#94a3b8",
                      }}
                    >
                      Aucun bien trouvé
                    </li>
                  ) : (
                    filteredBiens.map((b) => (
                      <li key={b.numeroBien}>
                        <button
                          type="button"
                          onClick={() => selectBien(b)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 12px",
                            border: "none",
                            background:
                              form.bienNumero === b.numeroBien
                                ? "#fefce8"
                                : "transparent",
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "#f8fafc";
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background =
                              form.bienNumero === b.numeroBien
                                ? "#fefce8"
                                : "transparent";
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{b.numeroBien}</div>
                          <div style={{ color: "#64748b", fontSize: 12 }}>
                            {b.nomDuBien}
                            {b.localite ? ` · ${b.localite}` : ""}
                            {b.statut ? ` · ${b.statut}` : ""}
                          </div>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            <div className="baux-form-row">
              <div>
                <label className="baux-form-label">ID Locataire *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.locataireId ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "locataireId",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="baux-form-input"
                  placeholder="Ex: 1"
                />
              </div>
              <div>
                <label className="baux-form-label">Nom locataire</label>
                <input
                  type="text"
                  value={form.locataireNom || ""}
                  onChange={(e) => handleChange("locataireNom", e.target.value)}
                  className="baux-form-input"
                  placeholder="Affichage uniquement"
                />
              </div>
            </div>

            <div className="baux-form-row">
              <div>
                <label className="baux-form-label">Date début *</label>
                <input
                  type="date"
                  required
                  value={form.dateDebut}
                  onChange={(e) => handleChange("dateDebut", e.target.value)}
                  className="baux-form-input"
                />
              </div>
              <div>
                <label className="baux-form-label">Date fin *</label>
                <input
                  type="date"
                  required
                  value={form.dateFin}
                  onChange={(e) => handleChange("dateFin", e.target.value)}
                  className="baux-form-input"
                />
              </div>
            </div>

            <div className="baux-form-row">
              <div>
                <label className="baux-form-label">Montant loyer (Ar)</label>
                <input
                  type="number"
                  min={0}
                  value={form.montantLoyer ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "montantLoyer",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="baux-form-input"
                  placeholder="450000"
                />
              </div>
              {mode === "edit" && (
                <div>
                  <label className="baux-form-label">Statut *</label>
                  <select
                    required
                    value={form.statut}
                    onChange={(e) => handleChange("statut", e.target.value)}
                    className="baux-form-input"
                  >
                    {Object.entries(statutConfig).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {mode === "edit" && (
              <>
                <div className="baux-form-section-title">
                  Circuit réglementaire
                </div>
                <div className="baux-form-row">
                  <label className="baux-checkbox-row">
                    <input
                      type="checkbox"
                      checked={!!form.accordMef}
                      onChange={(e) =>
                        handleChange("accordMef", e.target.checked)
                      }
                    />
                    Accord MEF
                  </label>
                  <label className="baux-checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.visaCf}
                      onChange={(e) =>
                        handleChange("visaCf", e.target.checked)
                      }
                    />
                    Visa CF
                  </label>
                </div>
                <div className="baux-form-row">
                  <label className="baux-checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.approbationSrb}
                      onChange={(e) =>
                        handleChange("approbationSrb", e.target.checked)
                      }
                    />
                    Approbation SRB
                  </label>
                  <label className="baux-checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.enregistreFiscal}
                      onChange={(e) =>
                        handleChange("enregistreFiscal", e.target.checked)
                      }
                    />
                    Enregistrement fiscal
                  </label>
                </div>
              </>
            )}

            <div className="baux-form-section-title">Bailleur</div>
            <div>
              <label className="baux-form-label">Nom du bailleur</label>
              <input
                type="text"
                value={form.nomBailleur || ""}
                onChange={(e) => handleChange("nomBailleur", e.target.value)}
                className="baux-form-input"
              />
            </div>
            <div className="baux-form-row">
              <div>
                <label className="baux-form-label">NIF</label>
                <input
                  type="text"
                  value={form.nifBailleur || ""}
                  onChange={(e) => handleChange("nifBailleur", e.target.value)}
                  className="baux-form-input"
                />
              </div>
              <div>
                <label className="baux-form-label">STAT</label>
                <input
                  type="text"
                  value={form.statBailleur || ""}
                  onChange={(e) => handleChange("statBailleur", e.target.value)}
                  className="baux-form-input"
                />
              </div>
            </div>
            <div>
              <label className="baux-form-label">RIB</label>
              <input
                type="text"
                value={form.ribBailleur || ""}
                onChange={(e) => handleChange("ribBailleur", e.target.value)}
                className="baux-form-input"
              />
            </div>

            <div>
              <label className="baux-form-label">Réf. demande</label>
              <input
                type="text"
                value={form.demandeReference || ""}
                onChange={(e) =>
                  handleChange("demandeReference", e.target.value)
                }
                className="baux-form-input"
                placeholder="Ex: DEM-2026-001"
              />
            </div>
          </div>

          <div className="baux-form-actions">
            <button type="button" className="baux-btn-cancel" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="baux-btn-submit" disabled={saving}>
              {saving
                ? "Enregistrement..."
                : mode === "create"
                  ? "Créer le bail"
                  : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}