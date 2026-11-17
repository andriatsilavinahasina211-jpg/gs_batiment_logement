"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import "./TravauxPage.css";
import {
  travauxApi,
  type BienOption,
} from "./api";
import type {
  Travaux,
  TypeTravaux,
  StatutTravaux,
  CreateTravauxPayload,
  UpdateTravauxPayload,
  HistoriqueItem,
} from "./types";
import { useFeedback } from "../shared/feedback";

/* ───────────────── Helpers UI & Config ───────────────── */
const statutConfig: Record<
  StatutTravaux,
  { label: string; color: string; bg: string }
> = {
  EN_ATTENTE: { label: "En attente", color: "#64748b", bg: "#f1f5f9" },
  EN_COURS: { label: "En cours", color: "#A67C00", bg: "#fefce8" },
  TERMINE: { label: "Terminé", color: "#16a34a", bg: "#dcfce7" },
  SUSPENDU: { label: "Suspendu", color: "#d97706", bg: "#fffbeb" },
  ANNULE: { label: "Annulé", color: "#dc2626", bg: "#fee2e2" },
};

const typeLabel: Record<TypeTravaux, string> = {
  ENTRETIEN: "Entretien",
  REHABILITATION: "Réhabilitation",
  AMENAGEMENT: "Aménagement",
  CONSTRUCTION_NOUVELLE: "Construction nouvelle",
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
};

const formatMoney = (n?: number | null) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MGA",
    maximumFractionDigits: 0,
  }).format(n);
};

const ITEMS_PER_PAGE = 10;

/* ───────────────── Modal Avancement Rapide ───────────────── */
function AvancementModal({
  travaux,
  onClose,
  onSaved,
}: {
  travaux: Travaux;
  onClose: () => void;
  onSaved: (updated: Travaux) => void;
}) {
  const [pourcent, setPourcent] = useState(travaux.avancementPourcent);
  const [statut, setStatut] = useState<StatutTravaux>(travaux.statut);
  const [dateDebutReelle, setDateDebutReelle] = useState(travaux.dateDebutReelle || "");
  const [dateFinReelle, setDateFinReelle] = useState(travaux.dateFinReelle || "");
  const [montantReel, setMontantReel] = useState<number | undefined>(
    travaux.montantReel ?? undefined
  );
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await travauxApi.updateAvancement(travaux.id, {
        avancementPourcent: pourcent,
        statut,
        commentaire: commentaire.trim() || undefined,
        dateDebutReelle: dateDebutReelle || undefined,
        dateFinReelle: dateFinReelle || undefined,
        montantReel,
      });
      onSaved(updated);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="travaux-modal-overlay form" onClick={onClose}>
      <div className="travaux-form-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="travaux-form-header">
          <div>
            <h2>Mettre à jour l&apos;avancement</h2>
            <p>{travaux.reference} · {travaux.bienNom || travaux.bienNumero}</p>
          </div>
          <button className="travaux-form-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="travaux-form-body">
          {error && (
            <div style={{ padding: "10px 14px", background: "#fee2e2", color: "#dc2626", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className="travaux-form-fields">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label className="travaux-form-label" style={{ margin: 0 }}>Pourcentage d&apos;avancement</label>
                <span style={{ fontWeight: 800, fontSize: 15, color: "var(--gold-dark)" }}>{pourcent} %</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={pourcent}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPourcent(val);
                  if (val === 100) setStatut("TERMINE");
                  else if (val > 0 && statut === "EN_ATTENTE") setStatut("EN_COURS");
                }}
                style={{ width: "100%", accentColor: "var(--gold)", cursor: "pointer" }}
              />
            </div>

            <div>
              <label className="travaux-form-label">Statut du chantier</label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as StatutTravaux)}
                className="travaux-form-input"
              >
                {Object.entries(statutConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="travaux-form-row">
              <div>
                <label className="travaux-form-label">Date début réelle</label>
                <input
                  type="date"
                  value={dateDebutReelle}
                  onChange={(e) => setDateDebutReelle(e.target.value)}
                  className="travaux-form-input"
                />
              </div>
              <div>
                <label className="travaux-form-label">Date fin réelle</label>
                <input
                  type="date"
                  value={dateFinReelle}
                  onChange={(e) => setDateFinReelle(e.target.value)}
                  className="travaux-form-input"
                />
              </div>
            </div>

            <div>
              <label className="travaux-form-label">Montant réel engagé (Ar)</label>
              <input
                type="number"
                min={0}
                value={montantReel ?? ""}
                onChange={(e) => setMontantReel(e.target.value ? Number(e.target.value) : undefined)}
                className="travaux-form-input"
                placeholder="Ex: 12500000"
              />
            </div>

            <div>
              <label className="travaux-form-label">Commentaire d&apos;étape (enregistré à l&apos;historique)</label>
              <textarea
                rows={2}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                className="travaux-form-textarea"
                placeholder="Ex: Fin des travaux de toiture, pose de peinture en cours..."
              />
            </div>
          </div>

          <div className="travaux-form-actions">
            <button type="button" className="travaux-btn-cancel" onClick={onClose}>Annuler</button>
            <button type="submit" className="travaux-btn-submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Valider l'avancement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ───────────────── Formulaire Création / Modification ───────────────── */
function TravauxForm({
  mode,
  travaux,
  biens,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  travaux?: Travaux;
  biens: BienOption[];
  onClose: () => void;
  onSave: (t: Travaux) => void;
}) {
  const [bienNumero, setBienNumero] = useState(travaux?.bienNumero || "");
  const [typeTravaux, setTypeTravaux] = useState<TypeTravaux>(
    travaux?.typeTravaux || "ENTRETIEN"
  );
  const [dateDebutPrevue, setDateDebutPrevue] = useState(
    travaux?.dateDebutPrevue || ""
  );
  const [dateFinPrevue, setDateFinPrevue] = useState(
    travaux?.dateFinPrevue || ""
  );
  const [dateDebutReelle, setDateDebutReelle] = useState(
    travaux?.dateDebutReelle || ""
  );
  const [dateFinReelle, setDateFinReelle] = useState(
    travaux?.dateFinReelle || ""
  );
  const [montantEstimatif, setMontantEstimatif] = useState<number | undefined>(
    travaux?.montantEstimatif ?? undefined
  );
  const [montantReel, setMontantReel] = useState<number | undefined>(
    travaux?.montantReel ?? undefined
  );
  const [statut, setStatut] = useState<StatutTravaux>(
    travaux?.statut || "EN_ATTENTE"
  );
  const [avancementPourcent, setAvancementPourcent] = useState<number>(
    travaux?.avancementPourcent ?? 0
  );
  const [referenceDevis, setReferenceDevis] = useState(
    travaux?.referenceDevis || ""
  );
  const [observations, setObservations] = useState(travaux?.observations || "");
  const [autorisationDpe, setAutorisationDpe] = useState(
    travaux?.autorisationDpe ?? false
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bien sélectionné
  const selectedBien = useMemo(() => {
    return biens.find((b) => b.numeroBien.toLowerCase() === bienNumero.toLowerCase().trim());
  }, [biens, bienNumero]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bienNumero.trim() || !dateDebutPrevue || !dateFinPrevue) {
      setError("Veuillez renseigner le bien et les dates prévues de début et de fin.");
      return;
    }

    if (new Date(dateDebutPrevue) >= new Date(dateFinPrevue)) {
      setError("La date de fin prévue doit être strictement postérieure à la date de début.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (mode === "create") {
        const payload: CreateTravauxPayload = {
          bienNumero: bienNumero.trim(),
          typeTravaux,
          dateDebutPrevue,
          dateFinPrevue,
          montantEstimatif,
          referenceDevis: referenceDevis.trim() || undefined,
          observations: observations.trim() || undefined,
          autorisationDpe,
        };
        const created = await travauxApi.create(payload);
        onSave(created);
      } else if (travaux) {
        const payload: UpdateTravauxPayload = {
          bienNumero: bienNumero.trim(),
          typeTravaux,
          dateDebutPrevue,
          dateFinPrevue,
          dateDebutReelle: dateDebutReelle || null,
          dateFinReelle: dateFinReelle || null,
          montantEstimatif,
          montantReel,
          statut,
          avancementPourcent,
          referenceDevis: referenceDevis.trim() || undefined,
          observations: observations.trim() || undefined,
          autorisationDpe,
        };
        const updated = await travauxApi.update(travaux.id, payload);
        onSave(updated);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="travaux-modal-overlay form" onClick={onClose}>
      <div className="travaux-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="travaux-form-header">
          <div>
            <h2>{mode === "create" ? "Nouveau chantier de travaux" : "Modifier le chantier"}</h2>
            <p>
              {mode === "create"
                ? "Enregistrement et vérification de conformité réglementaire (Circulaire N°813)"
                : travaux?.reference}
            </p>
          </div>
          <button className="travaux-form-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="travaux-form-body">
          {error && (
            <div style={{ padding: "10px 14px", background: "#fee2e2", color: "#dc2626", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className="travaux-form-fields">
            {/* Sélection du bien */}
            <div>
              <label className="travaux-form-label">Bien concerné *</label>
              <input
                type="text"
                list="biens-list"
                required
                value={bienNumero}
                onChange={(e) => setBienNumero(e.target.value)}
                className="travaux-form-input"
                placeholder="Tapez le numéro ou le nom du bien..."
              />
              <datalist id="biens-list">
                {biens.map((b) => (
                  <option key={b.numeroBien} value={b.numeroBien}>
                    {b.nomDuBien} {b.adresse ? `(${b.adresse})` : ""}
                  </option>
                ))}
              </datalist>
              {selectedBien && (
                <div style={{ fontSize: 12, color: "var(--gold-dark)", marginTop: 4, fontWeight: 600 }}>
                  ✓ {selectedBien.nomDuBien} {selectedBien.adresse ? `· ${selectedBien.adresse}` : ""}
                </div>
              )}
            </div>

            <div className="travaux-form-row">
              <div>
                <label className="travaux-form-label">Type de travaux *</label>
                <select
                  required
                  value={typeTravaux}
                  onChange={(e) => setTypeTravaux(e.target.value as TypeTravaux)}
                  className="travaux-form-input"
                >
                  {Object.entries(typeLabel).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {mode === "edit" ? (
                <div>
                  <label className="travaux-form-label">Statut *</label>
                  <select
                    required
                    value={statut}
                    onChange={(e) => setStatut(e.target.value as StatutTravaux)}
                    className="travaux-form-input"
                  >
                    {Object.entries(statutConfig).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <span className="travaux-form-label">Statut initial</span>
                  <span className="travaux-badge" style={{ background: "#f1f5f9", color: "#64748b", width: "fit-content" }}>
                    En attente (création)
                  </span>
                </div>
              )}
            </div>

            <div className="travaux-form-row">
              <div>
                <label className="travaux-form-label">Date début prévue *</label>
                <input
                  type="date"
                  required
                  value={dateDebutPrevue}
                  onChange={(e) => setDateDebutPrevue(e.target.value)}
                  className="travaux-form-input"
                />
              </div>
              <div>
                <label className="travaux-form-label">Date fin prévue *</label>
                <input
                  type="date"
                  required
                  value={dateFinPrevue}
                  onChange={(e) => setDateFinPrevue(e.target.value)}
                  className="travaux-form-input"
                />
              </div>
            </div>

            {mode === "edit" && (
              <div className="travaux-form-row">
                <div>
                  <label className="travaux-form-label">Date début réelle</label>
                  <input
                    type="date"
                    value={dateDebutReelle}
                    onChange={(e) => setDateDebutReelle(e.target.value)}
                    className="travaux-form-input"
                  />
                </div>
                <div>
                  <label className="travaux-form-label">Date fin réelle</label>
                  <input
                    type="date"
                    value={dateFinReelle}
                    onChange={(e) => setDateFinReelle(e.target.value)}
                    className="travaux-form-input"
                  />
                </div>
              </div>
            )}

            <div className="travaux-form-row">
              <div>
                <label className="travaux-form-label">Montant estimatif (Ar)</label>
                <input
                  type="number"
                  min={0}
                  value={montantEstimatif ?? ""}
                  onChange={(e) =>
                    setMontantEstimatif(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="travaux-form-input"
                  placeholder="Ex: 5000000"
                />
              </div>
              {mode === "edit" ? (
                <div>
                  <label className="travaux-form-label">Montant réel (Ar)</label>
                  <input
                    type="number"
                    min={0}
                    value={montantReel ?? ""}
                    onChange={(e) =>
                      setMontantReel(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="travaux-form-input"
                    placeholder="Ex: 4800000"
                  />
                </div>
              ) : (
                <div>
                  <label className="travaux-form-label">Réf. Devis</label>
                  <input
                    type="text"
                    value={referenceDevis}
                    onChange={(e) => setReferenceDevis(e.target.value)}
                    className="travaux-form-input"
                    placeholder="Ex: DEV-2026-001"
                  />
                </div>
              )}
            </div>

            {mode === "edit" && (
              <div className="travaux-form-row">
                <div>
                  <label className="travaux-form-label">Avancement (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={avancementPourcent}
                    onChange={(e) =>
                      setAvancementPourcent(
                        Math.min(100, Math.max(0, Number(e.target.value) || 0))
                      )
                    }
                    className="travaux-form-input"
                  />
                </div>
                <div>
                  <label className="travaux-form-label">Réf. Devis</label>
                  <input
                    type="text"
                    value={referenceDevis}
                    onChange={(e) => setReferenceDevis(e.target.value)}
                    className="travaux-form-input"
                    placeholder="Ex: DEV-2026-001"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="travaux-checkbox-row">
                <input
                  type="checkbox"
                  checked={autorisationDpe}
                  onChange={(e) => setAutorisationDpe(e.target.checked)}
                />
                Autorisation DPE accordée (obligatoire en cas de modification structurelle du bien)
              </label>
            </div>

            {mode === "create" && (
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 12.5,
                  color: "#1e40af",
                  lineHeight: 1.4,
                }}
              >
                ℹ️ <strong>Vérification automatique Circulaire N°813 :</strong> Le système vérifiera automatiquement
                l&apos;existence du Quitus de recensement N-1 pour ce bien dès la validation.
              </div>
            )}

            <div>
              <label className="travaux-form-label">Observations / Description</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
                className="travaux-form-textarea"
                placeholder="Détails techniques, nature des réfections, entreprise prestataire..."
              />
            </div>
          </div>

          <div className="travaux-form-actions">
            <button type="button" className="travaux-btn-cancel" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="travaux-btn-submit" disabled={saving}>
              {saving
                ? "Enregistrement en base..."
                : mode === "create"
                  ? "Créer le chantier"
                  : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ───────────────── Modal Détail Complet & Historique ───────────────── */
function TravauxDetailModal({
  travaux,
  onClose,
  onEdit,
  onUpdateAvancement,
  onDelete,
}: {
  travaux: Travaux;
  onClose: () => void;
  onEdit: (t: Travaux) => void;
  onUpdateAvancement: (t: Travaux) => void;
  onDelete: (t: Travaux) => void;
}) {
  const [activeTab, setActiveTab] = useState<"infos" | "historique">("infos");
  const [historique, setHistorique] = useState<HistoriqueItem[]>(travaux.historique || []);
  const [loadingHist, setLoadingHist] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchHist = async () => {
      setLoadingHist(true);
      try {
        const h = await travauxApi.getHistorique(travaux.id);
        if (mounted) setHistorique(h);
      } catch (err) {
        console.warn("Impossible de charger l'historique:", err);
      } finally {
        if (mounted) setLoadingHist(false);
      }
    };
    fetchHist();
    return () => {
      mounted = false;
    };
  }, [travaux.id]);

  const st = statutConfig[travaux.statut];

  return (
    <div className="travaux-modal-overlay" onClick={onClose}>
      <div className="travaux-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="travaux-detail-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h2>{travaux.reference}</h2>
              {travaux.enRetard && (
                <span className="travaux-alert-badge">⚠️ En retard</span>
              )}
            </div>
            <p>
              {typeLabel[travaux.typeTravaux]}
              {travaux.bienNom ? ` · ${travaux.bienNom}` : ` · Bien ${travaux.bienNumero}`}
            </p>
          </div>
          <button className="travaux-detail-close" onClick={onClose}>×</button>
        </div>

        <div className="travaux-detail-body">
          {/* Onglets */}
          <div className="travaux-modal-tabs">
            <button
              type="button"
              className={`travaux-modal-tab-btn ${activeTab === "infos" ? "active" : ""}`}
              onClick={() => setActiveTab("infos")}
            >
              Détails du chantier
            </button>
            <button
              type="button"
              className={`travaux-modal-tab-btn ${activeTab === "historique" ? "active" : ""}`}
              onClick={() => setActiveTab("historique")}
            >
              Historique ({historique.length})
            </button>
          </div>

          {activeTab === "infos" ? (
            <>
              {/* Alerte Circulaire N°813 */}
              {!travaux.quitusN1Present && (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 16,
                    fontSize: 12.5,
                    color: "#92400e",
                  }}
                >
                  ⚠️ <strong>Non conformité Circulaire N°813 :</strong> Le Quitus N-1 est absent pour ce bien lors du lancement des travaux.
                </div>
              )}

              <div className="travaux-detail-section">
                <div className="travaux-detail-section-title">Général & Avancement</div>
                <div className="travaux-detail-infos">
                  <div className="travaux-info-row">
                    <span className="travaux-info-label">Statut</span>
                    <span
                      className="travaux-badge"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                  <InfoRow label="Type" value={typeLabel[travaux.typeTravaux]} />
                  <InfoRow label="N° Bien" value={travaux.bienNumero} />
                  {travaux.bienNom && <InfoRow label="Nom du bien" value={travaux.bienNom} />}
                  <div className="travaux-info-row">
                    <span className="travaux-info-label">Avancement</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="travaux-progress-bar" style={{ width: 80, height: 6 }}>
                        <div
                          className="travaux-progress-fill"
                          style={{ width: `${travaux.avancementPourcent}%` }}
                        />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{travaux.avancementPourcent} %</span>
                    </div>
                  </div>
                  {travaux.referenceDevis && (
                    <InfoRow label="Réf. devis" value={travaux.referenceDevis} />
                  )}
                  {travaux.createdBy && (
                    <InfoRow
                      label="Enregistré par"
                      value={`${travaux.createdBy.prenom || ""} ${travaux.createdBy.nom}`.trim()}
                    />
                  )}
                </div>
              </div>

              <div className="travaux-detail-section">
                <div className="travaux-detail-section-title">Calendrier</div>
                <div className="travaux-detail-infos">
                  <InfoRow label="Début prévu" value={formatDate(travaux.dateDebutPrevue)} />
                  <InfoRow label="Fin prévue" value={formatDate(travaux.dateFinPrevue)} />
                  <InfoRow label="Début réel" value={formatDate(travaux.dateDebutReelle)} />
                  <InfoRow label="Fin réelle" value={formatDate(travaux.dateFinReelle)} />
                </div>
              </div>

              <div className="travaux-detail-section">
                <div className="travaux-detail-section-title">Finances & Conformité</div>
                <div className="travaux-detail-infos">
                  <InfoRow label="Montant estimatif" value={formatMoney(travaux.montantEstimatif)} />
                  <InfoRow label="Montant réel" value={formatMoney(travaux.montantReel)} />
                  <div className="travaux-info-row">
                    <span className="travaux-info-label">Quitus N-1</span>
                    <span
                      className={`travaux-quitus-badge ${travaux.quitusN1Present ? "ok" : "warn"}`}
                    >
                      {travaux.quitusN1Present ? "✓ Présent (Conforme)" : "⚠️ Absent"}
                    </span>
                  </div>
                  <InfoRow
                    label="Autorisation DPE"
                    value={travaux.autorisationDpe ? "Oui ✓" : "Non"}
                  />
                </div>
              </div>

              {travaux.observations && (
                <div className="travaux-detail-section">
                  <div className="travaux-detail-section-title">Observations</div>
                  <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, background: "var(--bg)", padding: "10px 12px", borderRadius: 8 }}>
                    {travaux.observations}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="travaux-historique-list">
              {loadingHist ? (
                <div style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                  <span className="travaux-spinner" />
                  <div style={{ marginTop: 8 }}>Chargement de l&apos;historique…</div>
                </div>
              ) : historique.length === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                  Aucun historique enregistré pour ce chantier.
                </div>
              ) : (
                historique.map((h) => (
                  <div key={h.id} className="travaux-historique-item">
                    <div className="travaux-historique-top">
                      <span><strong>{h.action}</strong> {h.user ? `par ${h.user.prenom || ""} ${h.user.nom}` : ""}</span>
                      <span>{formatDate(h.createdAt)}</span>
                    </div>
                    {h.commentaire && (
                      <div className="travaux-historique-comment">{h.commentaire}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          <div className="travaux-detail-actions">
            <button
              className="travaux-btn-primary"
              style={{ flex: 1 }}
              onClick={() => onUpdateAvancement(travaux)}
            >
              📈 Avancement
            </button>
            <button
              className="travaux-btn-secondary"
              onClick={() => onEdit(travaux)}
            >
              ✎ Modifier
            </button>
            <button
              className="travaux-btn-danger"
              onClick={() => onDelete(travaux)}
            >
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
    <div className="travaux-info-row">
      <span className="travaux-info-label">{label}</span>
      <span className="travaux-info-value">{value}</span>
    </div>
  );
}

/* ───────────────── Page Principale Travaux ───────────────── */
export default function TravauxPage() {
  const [travauxList, setTravauxList] = useState<Travaux[]>([]);
  const [biensList, setBiensList] = useState<BienOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres & Recherche
  const [search, setSearch] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<string>("TOUS");
  const [filtreType, setFiltreType] = useState<string>("TOUS");
  const [filtreSpecial, setFiltreSpecial] = useState<"TOUS" | "RETARD" | "SANS_QUITUS">("TOUS");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [selected, setSelected] = useState<Travaux | null>(null);
  const [editing, setEditing] = useState<Travaux | null>(null);
  const [updatingAvancement, setUpdatingAvancement] = useState<Travaux | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Notifications & confirmations
  const { toast, confirmAction } = useFeedback();

  // Chargement des données
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, biens] = await Promise.all([
        travauxApi.getAll(),
        travauxApi.getBiens(),
      ]);
      setTravauxList(list);
      setBiensList(biens);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les données des travaux.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Statistiques KPI
  const stats = useMemo(() => {
    const total = travauxList.length;
    const enCours = travauxList.filter((t) => t.statut === "EN_COURS").length;
    const termines = travauxList.filter((t) => t.statut === "TERMINE").length;
    const enRetard = travauxList.filter((t) => t.enRetard).length;
    const sansQuitus = travauxList.filter((t) => !t.quitusN1Present && t.statut !== "ANNULE").length;
    return { total, enCours, termines, enRetard, sansQuitus };
  }, [travauxList]);

  // Filtrage combiné
  const filtered = useMemo(() => {
    return travauxList.filter((t) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.reference.toLowerCase().includes(q) ||
        t.bienNumero.toLowerCase().includes(q) ||
        (t.bienNom || "").toLowerCase().includes(q) ||
        (t.referenceDevis || "").toLowerCase().includes(q) ||
        (t.observations || "").toLowerCase().includes(q);

      const matchStatut = filtreStatut === "TOUS" || t.statut === filtreStatut;
      const matchType = filtreType === "TOUS" || t.typeTravaux === filtreType;

      let matchSpecial = true;
      if (filtreSpecial === "RETARD") matchSpecial = Boolean(t.enRetard);
      if (filtreSpecial === "SANS_QUITUS") matchSpecial = !t.quitusN1Present && t.statut !== "ANNULE";

      return matchSearch && matchStatut && matchType && matchSpecial;
    });
  }, [travauxList, search, filtreStatut, filtreType, filtreSpecial]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const current = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Gestion des actions
  const handleEdit = (t: Travaux) => {
    setSelected(null);
    setUpdatingAvancement(null);
    setEditing(t);
  };

  const handleUpdateAvancement = (t: Travaux) => {
    setSelected(null);
    setEditing(null);
    setUpdatingAvancement(t);
  };

  const handleSaveEdit = (updated: Travaux) => {
    setTravauxList((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setEditing(null);
    setSelected(updated);
    toast.success(
      "Chantier modifié",
      `Le chantier ${updated.reference} a été mis à jour avec succès.`
    );
  };

  const handleSaveAvancement = (updated: Travaux) => {
    setTravauxList((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setUpdatingAvancement(null);
    setSelected(updated);
    toast.success(
      "Avancement mis à jour",
      `L'avancement du chantier ${updated.reference} est désormais de ${updated.avancementPourcent} %.`
    );
  };

  const handleCreate = (newT: Travaux) => {
    setTravauxList((prev) => [newT, ...prev]);
    setShowCreate(false);
    setCurrentPage(1);
    toast.success(
      "Chantier créé",
      `Le chantier ${newT.reference} a été enregistré avec succès.`
    );
  };

  const handleDelete = async (t: Travaux) => {
    if (
      !(await confirmAction({
        title: "Confirmer la suppression",
        message: `Vous êtes sur le point de supprimer définitivement le chantier « ${t.reference} ». Cette action est irréversible.`,
        confirmLabel: "Supprimer",
        type: "warning",
      }))
    ) {
      return;
    }

    try {
      await travauxApi.remove(t.id);
      setTravauxList((prev) => prev.filter((x) => x.id !== t.id));
      setSelected(null);
      toast.success(
        "Chantier supprimé",
        `Le chantier ${t.reference} a été supprimé avec succès.`
      );
    } catch (err: any) {
      toast.error(
        "Échec de la suppression",
        err.message || "Une erreur est survenue lors de la suppression du chantier."
      );
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
        <span className="travaux-spinner" />
        <div style={{ marginTop: 12 }}>Chargement des travaux depuis la base de données…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: "var(--red)", marginBottom: 16 }}>{error}</p>
        <button
          onClick={loadData}
          className="travaux-btn-primary"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="travaux-page">
      {/* En-tête */}
      <div className="travaux-header">
        <div>
          <h2>Gestion des Travaux & Réhabilitations</h2>
          <p>
            Suivi des chantiers, contrôle d&apos;avancement et conformité réglementaire (Circulaire N°813)
          </p>
        </div>
        <button
          className="travaux-btn-primary"
          onClick={() => setShowCreate(true)}
        >
          + Nouveaux travaux
        </button>
      </div>

      {/* Cartes KPI interactives */}
      <div className="travaux-kpi-grid">
        <div
          className={`travaux-kpi-card ${filtreSpecial === "TOUS" && filtreStatut === "TOUS" ? "active" : ""}`}
          onClick={() => {
            setFiltreSpecial("TOUS");
            setFiltreStatut("TOUS");
            setCurrentPage(1);
          }}
        >
          <span className="travaux-kpi-label">Total chantiers</span>
          <span className="travaux-kpi-value">{stats.total}</span>
          <span className="travaux-kpi-desc">Tous chantiers confondus</span>
        </div>

        <div
          className={`travaux-kpi-card ${filtreStatut === "EN_COURS" ? "active" : ""}`}
          onClick={() => {
            setFiltreSpecial("TOUS");
            setFiltreStatut("EN_COURS");
            setCurrentPage(1);
          }}
        >
          <span className="travaux-kpi-label">En cours</span>
          <span className="travaux-kpi-value" style={{ color: "var(--gold-dark)" }}>
            {stats.enCours}
          </span>
          <span className="travaux-kpi-desc">Actuellement en exécution</span>
        </div>

        <div
          className={`travaux-kpi-card ${filtreStatut === "TERMINE" ? "active" : ""}`}
          onClick={() => {
            setFiltreSpecial("TOUS");
            setFiltreStatut("TERMINE");
            setCurrentPage(1);
          }}
        >
          <span className="travaux-kpi-label">Terminés</span>
          <span className="travaux-kpi-value" style={{ color: "var(--green)" }}>
            {stats.termines}
          </span>
          <span className="travaux-kpi-desc">Chantiers clôturés</span>
        </div>

        <div
          className={`travaux-kpi-card ${filtreSpecial === "RETARD" ? "active" : ""}`}
          onClick={() => {
            setFiltreSpecial(filtreSpecial === "RETARD" ? "TOUS" : "RETARD");
            setCurrentPage(1);
          }}
        >
          <span className="travaux-kpi-label">En retard</span>
          <span className="travaux-kpi-value" style={{ color: "var(--red)" }}>
            {stats.enRetard}
          </span>
          <span className="travaux-kpi-desc">Date fin prévue dépassée</span>
        </div>

        <div
          className={`travaux-kpi-card ${filtreSpecial === "SANS_QUITUS" ? "active" : ""}`}
          onClick={() => {
            setFiltreSpecial(filtreSpecial === "SANS_QUITUS" ? "TOUS" : "SANS_QUITUS");
            setCurrentPage(1);
          }}
        >
          <span className="travaux-kpi-label">Sans Quitus N-1</span>
          <span className="travaux-kpi-value" style={{ color: "var(--orange)" }}>
            {stats.sansQuitus}
          </span>
          <span className="travaux-kpi-desc">Non-conformité Circ. N°813</span>
        </div>
      </div>

      {/* Barre de Filtres */}
      <div className="travaux-filters">
        <div className="travaux-search">
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
            placeholder="Rechercher par réf., bien, devis, prestataire..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <select
          className="travaux-select"
          value={filtreType}
          onChange={(e) => {
            setFiltreType(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="TOUS">Tous les types</option>
          {Object.entries(typeLabel).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          className="travaux-select"
          value={filtreStatut}
          onChange={(e) => {
            setFiltreStatut(e.target.value);
            setFiltreSpecial("TOUS");
            setCurrentPage(1);
          }}
        >
          <option value="TOUS">Tous les statuts</option>
          {Object.entries(statutConfig).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {filtreSpecial !== "TOUS" && (
          <button
            type="button"
            className="travaux-btn-cancel"
            style={{ padding: "8px 12px", fontSize: 12 }}
            onClick={() => {
              setFiltreSpecial("TOUS");
              setCurrentPage(1);
            }}
          >
            ✕ Réinitialiser filtre spécial
          </button>
        )}
      </div>

      {/* Tableau ou état vide */}
      {current.length === 0 ? (
        <div className="travaux-empty">
          Aucun chantier de travaux ne correspond à vos critères de recherche.
        </div>
      ) : (
        <>
          <div className="travaux-table-wrap">
            <table className="travaux-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Type</th>
                  <th>Bien</th>
                  <th>Début prévu</th>
                  <th>Fin prévue</th>
                  <th>Avancement</th>
                  <th>Statut</th>
                  <th>Conformité</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {current.map((t) => {
                  const st = statutConfig[t.statut];
                  return (
                    <tr key={t.id} onClick={() => setSelected(t)}>
                      <td className="travaux-td-strong">
                        {t.reference}
                        {t.enRetard && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: "var(--red)" }}>
                            ⚠️
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="travaux-type-badge">
                          {typeLabel[t.typeTravaux]}
                        </span>
                      </td>
                      <td>
                        <div className="travaux-td-strong">
                          {t.bienNom || t.bienNumero}
                        </div>
                        {t.bienNom && (
                          <div className="travaux-td-muted">{t.bienNumero}</div>
                        )}
                      </td>
                      <td className="travaux-td-muted">
                        {formatDate(t.dateDebutPrevue)}
                      </td>
                      <td className="travaux-td-muted">
                        {formatDate(t.dateFinPrevue)}
                      </td>
                      <td>
                        <div className="travaux-progress">
                          <div className="travaux-progress-bar">
                            <div
                              className="travaux-progress-fill"
                              style={{ width: `${t.avancementPourcent}%` }}
                            />
                          </div>
                          <span className="travaux-progress-label">
                            {t.avancementPourcent}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="travaux-badge"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`travaux-quitus-badge ${t.quitusN1Present ? "ok" : "warn"}`}
                          title={
                            t.quitusN1Present
                              ? "Quitus N-1 présent selon Circulaire N°813"
                              : "Quitus N-1 absent (non-conformité)"
                          }
                        >
                          {t.quitusN1Present ? "Quitus ✓" : "Quitus ⚠️"}
                        </span>
                      </td>
                      <td>
                        <div
                          className="travaux-td-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="travaux-btn-icon"
                            title="Mettre à jour l'avancement"
                            onClick={() => handleUpdateAvancement(t)}
                          >
                            📈
                          </button>
                          <button
                            className="travaux-btn-icon"
                            title="Modifier"
                            onClick={() => handleEdit(t)}
                          >
                            ✎
                          </button>
                          <button
                            className="travaux-btn-icon danger"
                            title="Supprimer"
                            onClick={() => handleDelete(t)}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="travaux-pagination">
              <button
                className="travaux-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`travaux-page-num ${page === currentPage ? "active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="travaux-page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant →
              </button>
            </div>
          )}

          <div className="travaux-pagination-info">
            Page {currentPage} sur {totalPages} — Affichage de {startIndex + 1} à{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} sur {filtered.length}
          </div>
        </>
      )}

      {/* Modal Détail */}
      {selected && (
        <TravauxDetailModal
          travaux={selected}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onUpdateAvancement={handleUpdateAvancement}
          onDelete={handleDelete}
        />
      )}

      {/* Modal Mise à jour Avancement */}
      {updatingAvancement && (
        <AvancementModal
          travaux={updatingAvancement}
          onClose={() => setUpdatingAvancement(null)}
          onSaved={handleSaveAvancement}
        />
      )}

      {/* Modal Modification complète */}
      {editing && (
        <TravauxForm
          mode="edit"
          travaux={editing}
          biens={biensList}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Modal Création */}
      {showCreate && (
        <TravauxForm
          mode="create"
          biens={biensList}
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}