"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import "./AttestationsPage.css";
import type { Attestation, StatutAttestation, TypeAttestation } from "./types";
import { attestationsApi } from "./api";
import { useFeedback } from "../shared/feedback";

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

/* ───────────────── Modal détail ───────────────── */
function AttestationDetailModal({
  attestation,
  onClose,
  onValider,
  onDownloadPdf,
  busy,
}: {
  attestation: Attestation;
  onClose: () => void;
  onValider: (a: Attestation) => void;
  onDownloadPdf: (a: Attestation) => void;
  busy: boolean;
}) {
  const st = statutConfig[attestation.statut];
  const canValider = attestation.statut === "BROUILLON";
  const canDownload =
    attestation.statut === "VALIDEE" || attestation.statut === "GENERE";

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
            <div className="attestations-info-row">
              <span className="attestations-info-label">Statut</span>
              <span
                className="attestations-badge"
                style={{ background: st.bg, color: st.color }}
              >
                {st.label}
              </span>
            </div>
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
            {canValider && (
              <button
                type="button"
                className="attestations-btn-primary"
                disabled={busy}
                onClick={() => onValider(attestation)}
              >
                {busy ? "Validation…" : "Valider (Chef SRB)"}
              </button>
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
  const [busy, setBusy] = useState(false);

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
        filtreStatut === "TOUS" || a.statut === filtreStatut;
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
      toast.success("Attestation validée", `L\'attestation ${a.reference} a été validée avec succès.`);
    } catch (e: unknown) {
      toast.error("Échec de la validation", e instanceof Error ? e.message : "Une erreur est survenue lors de la validation de l\'attestation.");
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
                  const st = statutConfig[a.statut];
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
          onDownloadPdf={handleDownloadPdf}
          busy={busy}
        />
      )}
    </div>
  );
}