"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import "./AttestationsPage.css";
import type { Attestation, StatutAttestation, TypeAttestation } from "./types";
import { attestationsApi } from "./api";
import { useFeedback } from "../shared/feedback";
import { getStoredUser } from "../../lib/auth";

const statutConfig: Record<
  StatutAttestation,
  { label: string; color: string; bg: string }
> = {
  BROUILLON: { label: "Brouillon", color: "#64748b", bg: "#f1f5f9" },
  VALIDEE: { label: "Validée", color: "#16a34a", bg: "#dcfce7" },
  GENERE: { label: "Générée", color: "#2563eb", bg: "#eff6ff" },
  ARCHIVEE: { label: "Archivée", color: "#A67C00", bg: "#fefce8" },
};

const typeLabel: Record<TypeAttestation, string> = {
  NON_LOGEMENT: "Non-logement",
  NON_OCCUPATION: "Non-occupation",
};

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
};

const ITEMS_PER_PAGE = 10;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="attestations-info-row">
      <span className="attestations-info-label">{label}</span>
      <span className="attestations-info-value">{value}</span>
    </div>
  );
}

/* ───────────────── Modal refus ───────────────── */
function RefuseAttestationModal({
  attestation,
  onClose,
  onConfirm,
  busy,
}: {
  attestation: Attestation;
  onClose: () => void;
  onConfirm: (motif: string) => void;
  busy: boolean;
}) {
  const [motif, setMotif] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motif.trim()) {
      setError("Le motif de refus est obligatoire pour motiver la décision.");
      return;
    }
    onConfirm(motif.trim());
  };

  return (
    <div
      className="attestations-modal-overlay"
      onClick={onClose}
      style={{ zIndex: 1100 }}
    >
      <div
        className="attestations-detail-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div className="attestations-detail-header">
          <div>
            <h2 style={{ color: "#dc2626" }}>Refuser la demande d&apos;attestation</h2>
            <p>
              Réf. {attestation.reference}
              {attestation.demandeurNom ? ` · ${attestation.demandeurNom}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="attestations-detail-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <p
            style={{
              fontSize: 13,
              color: "#475569",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Veuillez indiquer le motif réglementaire du refus. Ce motif sera
            enregistré, notifié au demandeur et mettra à jour la demande en
            statut <strong>REJETÉE</strong>.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#1e293b",
                marginBottom: 6,
              }}
            >
              Motif du refus *
            </label>
            <textarea
              rows={4}
              value={motif}
              onChange={(e) => {
                setMotif(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ex : Bénéfice d'un logement de fonction déjà actif, pièces justificatives manquantes ou non conformes..."
              style={{
                width: "100%",
                padding: "10px 12px",
                border: error ? "1px solid #ef4444" : "1px solid #cbd5e1",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
              autoFocus
            />
            {error && (
              <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                {error}
              </p>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              className="attestations-btn-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontWeight: 600,
                fontSize: 13,
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "Traitement…" : "Confirmer le refus"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ───────────────── Modal détail ───────────────── */
function AttestationDetailModal({
  attestation,
  onClose,
  onValider,
  onRefuserClick,
  onDownloadPdf,
  busy,
  canValidate,
}: {
  attestation: Attestation;
  onClose: () => void;
  onValider: (a: Attestation) => void;
  onRefuserClick: (a: Attestation) => void;
  onDownloadPdf: (a: Attestation) => void;
  busy: boolean;
  canValidate: boolean;
}) {
  const st = attestation.isRefusee
    ? { label: "Refusée", color: "#dc2626", bg: "#fee2e2" }
    : statutConfig[attestation.statut];

  const canValider = attestation.statut === "BROUILLON" && !attestation.isRefusee;
  const canDownload =
    !attestation.isRefusee &&
    (attestation.statut === "VALIDEE" || attestation.statut === "GENERE");

  return (
    <div className="attestations-modal-overlay" onClick={onClose}>
      <div
        className="attestations-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="attestations-detail-header">
          <div>
            <h2>{attestation.reference}</h2>
            <p>
              {typeLabel[attestation.typeAttestation] ??
                attestation.typeAttestation}
              {attestation.demandeurNom
                ? ` · ${attestation.demandeurNom}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            className="attestations-detail-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="attestations-detail-body">
          <div className="attestations-detail-infos">
            {attestation.isRefusee && (
              <div
                style={{
                  background: "#fee2e2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "#dc2626",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  Demande d&apos;attestation refusée
                </div>
                <div style={{ fontSize: 13, color: "#991b1b" }}>
                  <strong>Motif :</strong>{" "}
                  {attestation.motifRefus || "Aucun motif spécifié"}
                </div>
                {attestation.dateRefus && (
                  <div
                    style={{ fontSize: 11, color: "#b91c1c", marginTop: 4 }}
                  >
                    Refusée le {formatDate(attestation.dateRefus)}
                  </div>
                )}
              </div>
            )}

            <div className="attestations-info-row">
              <span className="attestations-info-label">Statut</span>
              <span
                className="attestations-badge"
                style={{ background: st.bg, color: st.color }}
              >
                {st.label}
              </span>
            </div>

            {attestation.demandeReference && (
              <InfoRow
                label="Demande liée"
                value={attestation.demandeReference}
              />
            )}

            <InfoRow
              label="Type"
              value={
                typeLabel[attestation.typeAttestation] ??
                attestation.typeAttestation
              }
            />
            {attestation.demandeurNom && (
              <InfoRow label="Demandeur" value={attestation.demandeurNom} />
            )}
            <InfoRow
              label="Date création"
              value={formatDate(attestation.createdAt)}
            />
            <InfoRow
              label="Date génération"
              value={formatDate(attestation.dateGeneration)}
            />
            <InfoRow
              label="Visa supérieur"
              value={attestation.visaSuperieur ? "Oui ✓" : "Non"}
            />
            <InfoRow
              label="Déclaration légalisée"
              value={
                attestation.declarationHonneurLegalisee ? "Oui ✓" : "Non"
              }
            />
          </div>

          <div className="attestations-detail-actions">
            {canValider && canValidate && (
              <>
                <button
                  type="button"
                  className="attestations-btn-primary"
                  disabled={busy}
                  onClick={() => onValider(attestation)}
                >
                  {busy ? "Validation…" : "✓ Valider (Chef SRB)"}
                </button>
                <button
                  type="button"
                  style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                  disabled={busy}
                  onClick={() => onRefuserClick(attestation)}
                >
                  ✕ Refuser
                </button>
              </>
            )}

            {canDownload && (
              <button
                type="button"
                className="attestations-btn-primary"
                disabled={busy}
                onClick={() => onDownloadPdf(attestation)}
              >
                {busy ? "Génération…" : "📄 Télécharger le PDF"}
              </button>
            )}

            <button
              type="button"
              className="attestations-btn-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Page principale ───────────────── */
export default function AttestationsPage() {
  const { toast, confirmAction } = useFeedback();

  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<string>("TOUS");
  const [filtreType, setFiltreType] = useState<string>("TOUS");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<Attestation | null>(null);
  const [refusingAttestation, setRefusingAttestation] = useState<Attestation | null>(null);
  const [busy, setBusy] = useState(false);

  const canValidate = ["CHEF_SRB", "ADMINISTRATEUR"].includes(
    getStoredUser()?.role ?? ""
  );

  const loadAttestations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await attestationsApi.getAll();
      setAttestations(data);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Impossible de charger les attestations"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttestations();
  }, [loadAttestations]);

  const filtered = useMemo(() => {
    return attestations.filter((a) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search.trim() ||
        a.reference.toLowerCase().includes(q) ||
        (a.demandeurNom || "").toLowerCase().includes(q);

      const matchStatut =
        filtreStatut === "TOUS"
          ? true
          : filtreStatut === "REFUSEE"
          ? a.isRefusee
          : !a.isRefusee && a.statut === filtreStatut;
      const matchType =
        filtreType === "TOUS" || a.typeAttestation === filtreType;

      return matchSearch && matchStatut && matchType;
    });
  }, [attestations, search, filtreStatut, filtreType]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / ITEMS_PER_PAGE)
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const current = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleValider = async (a: Attestation) => {
    if (
      !(await confirmAction({
        title: "Valider l'attestation",
        message: `L'attestation « ${a.reference} » passera au statut VALIDÉE et son PDF pourra être téléchargé.`,
        confirmLabel: "Valider l'attestation",
        type: "info",
      }))
    ) {
      return;
    }
    setBusy(true);
    try {
      await attestationsApi.valider(a.id);
      setSelected(null);
      await loadAttestations();
      toast.success(
        "Attestation validée",
        `L'attestation ${a.reference} et sa demande associée ont été validées.`
      );
    } catch (e: unknown) {
      toast.error("Échec de la validation", e instanceof Error ? e.message : "Une erreur est survenue lors de la validation de l\'attestation.");
    } finally {
      setBusy(false);
    }
  };

  const handleRefuser = async (motif: string) => {
    if (!refusingAttestation) return;
    setBusy(true);
    try {
      await attestationsApi.refuser(refusingAttestation.id, motif);
      toast.success(
        "Attestation refusée",
        `L'attestation ${refusingAttestation.reference} et sa demande associée ont été refusées.`
      );
      setRefusingAttestation(null);
      setSelected(null);
      await loadAttestations();
    } catch (e: unknown) {
      toast.error(
        "Échec du refus",
        e instanceof Error
          ? e.message
          : "Une erreur est survenue lors du refus de l'attestation."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadPdf = async (a: Attestation) => {
    setBusy(true);
    try {
      await attestationsApi.downloadPdf(a.id, a.reference);
      await loadAttestations();
    } catch (e: unknown) {
      toast.error("Échec du téléchargement", e instanceof Error ? e.message : "Une erreur est survenue lors de la génération du PDF.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="attestations-empty" style={{ padding: 48 }}>
        Chargement des attestations…
      </div>
    );
  }

  if (error) {
    return (
      <div className="attestations-empty" style={{ padding: 48 }}>
        <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>
        <button
          type="button"
          className="attestations-btn-primary"
          onClick={loadAttestations}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="attestations-page">
      <div className="attestations-header">
        <div>
          <h2>Attestations</h2>
          <p>
            {filtered.length} attestation
            {filtered.length > 1 ? "s" : ""} — création uniquement via
            l&apos;onglet <strong>Demandes</strong>
          </p>
        </div>
        {/* Pas de bouton « Nouvelle attestation » */}
      </div>

      <div className="attestations-filters">
        <div className="attestations-search">
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
            placeholder="Rechercher par réf., demandeur..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <select
          className="attestations-select"
          value={filtreType}
          onChange={(e) => {
            setFiltreType(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="TOUS">Tous les types</option>
          <option value="NON_LOGEMENT">Non-logement</option>
          <option value="NON_OCCUPATION">Non-occupation</option>
        </select>

        <select
          className="attestations-select"
          value={filtreStatut}
          onChange={(e) => {
            setFiltreStatut(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="TOUS">Tous les statuts</option>
          {Object.entries(statutConfig).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
          <option value="REFUSEE">Refusée</option>
        </select>
      </div>

      {current.length === 0 ? (
        <div className="attestations-empty">
          Aucune attestation. Créez une demande de type « Attestation » dans
          l&apos;onglet Demandes (non-logement ou non-occupation).
        </div>
      ) : (
        <>
          <div className="attestations-table-wrap">
            <table className="attestations-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Type</th>
                  <th>Demandeur</th>
                  <th>Date création</th>
                  <th>Visa</th>
                  <th>Décl. légalisée</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {current.map((a) => {
                  const st = a.isRefusee
                    ? { label: "Refusée", color: "#dc2626", bg: "#fee2e2" }
                    : statutConfig[a.statut];
                  return (
                    <tr key={a.id} onClick={() => setSelected(a)}>
                      <td className="attestations-td-strong">
                        {a.reference}
                      </td>
                      <td>
                        <span className="attestations-type-badge">
                          {typeLabel[a.typeAttestation] ?? a.typeAttestation}
                        </span>
                      </td>
                      <td>{a.demandeurNom || "—"}</td>
                      <td className="attestations-td-muted">
                        {formatDate(a.createdAt)}
                      </td>
                      <td className="attestations-check">
                        {a.visaSuperieur ? "✓" : "—"}
                      </td>
                      <td className="attestations-check">
                        {a.declarationHonneurLegalisee ? "✓" : "—"}
                      </td>
                      <td>
                        <span
                          className="attestations-badge"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="attestations-pagination">
              <button
                type="button"
                className="attestations-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    type="button"
                    className={`attestations-page-num${
                      page === currentPage ? " active" : ""
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                type="button"
                className="attestations-page-btn"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Suivant →
              </button>
            </div>
          )}

          <div className="attestations-pagination-info">
            Page {currentPage} sur {totalPages} — Affichage de{" "}
            {startIndex + 1} à{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} sur{" "}
            {filtered.length}
          </div>
        </>
      )}

      {selected && (
        <AttestationDetailModal
          attestation={selected}
          onClose={() => setSelected(null)}
          onValider={handleValider}
          onRefuserClick={(a) => setRefusingAttestation(a)}
          onDownloadPdf={handleDownloadPdf}
          busy={busy}
          canValidate={canValidate}
        />
      )}

      {refusingAttestation && (
        <RefuseAttestationModal
          attestation={refusingAttestation}
          onClose={() => setRefusingAttestation(null)}
          onConfirm={handleRefuser}
          busy={busy}
        />
      )}
    </div>
  );
}