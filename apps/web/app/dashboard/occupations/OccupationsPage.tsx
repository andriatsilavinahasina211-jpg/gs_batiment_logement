"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import "./OccupationsPage.css";
import type { Occupation } from "./types";
import {
  statutConfig,
  formatDate,
  ITEMS_PER_PAGE,
  canGenerateEtatDesLieux,
} from "./constants";
import { occupationsApi } from "./api";
import { useFeedback } from "../shared/feedback";
import { OccupationForm } from "./OccupationForm";
import { OccupationDetailModal } from "./OccupationDetailModal";
import { EtatDesLieuxForm } from "./EtatDesLieuxForm";

/* ───────────────── Onglets ───────────────── */
type OccupationTab = "demandes" | "approuvees" | "historique";

const TAB_STATUTS: Record<OccupationTab, string[]> = {
  demandes: ["EN_ATTENTE", "EN_VALIDATION"],
  approuvees: ["APPROUVE", "EN_COURS", "FIN_PROCHE", "DEMANDE_LIBERATION"],
  historique: ["LIBERE", "LIBERATION_VALIDEE", "SANS_TITRE"],
};

const TAB_LABELS: Record<OccupationTab, string> = {
  demandes: "Demandes en cours",
  approuvees: "Approuvées",
  historique: "Historique",
};

const TAB_BANNERS: Record<OccupationTab, string> = {
  demandes:
    "Occupations issues d'une demande d'occupation, en attente de validation. La création se fait uniquement depuis l'onglet Demandes.",
  approuvees:
    "Occupations validées ou en cours. Vous pouvez générer un état des lieux. Les libérations se demandent depuis l'onglet Demandes.",
  historique:
    "Occupations terminées ou sans titre. Consultation uniquement.",
};

export default function OccupationsPage() {
  const { toast, confirmAction } = useFeedback();

  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<OccupationTab>("demandes");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selected, setSelected] = useState<Occupation | null>(null);
  const [editing, setEditing] = useState<Occupation | null>(null);
  const [edlOccupation, setEdlOccupation] = useState<Occupation | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const loadOccupations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await occupationsApi.getAll();
      setOccupations(list);
    } catch (e: any) {
      setError(e.message || "Impossible de charger les occupations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOccupations();
  }, [loadOccupations]);

  const counts = useMemo(() => {
    const c: Record<OccupationTab, number> = {
      demandes: 0,
      approuvees: 0,
      historique: 0,
    };
    for (const o of occupations) {
      (Object.keys(TAB_STATUTS) as OccupationTab[]).forEach((tab) => {
        if (TAB_STATUTS[tab].includes(o.statut)) c[tab] += 1;
      });
    }
    return c;
  }, [occupations]);

  const filtered = useMemo(() => {
    const statuts = TAB_STATUTS[activeTab];
    const q = search.toLowerCase().trim();

    return occupations.filter((o) => {
      if (!statuts.includes(o.statut)) return false;
      if (!q) return true;
      return (
        o.numeroOccupation.toLowerCase().includes(q) ||
        o.bienNumero.toLowerCase().includes(q) ||
        (o.bienNom || "").toLowerCase().includes(q) ||
        (o.occupantNom || "").toLowerCase().includes(q) ||
        (o.demandeReference || "").toLowerCase().includes(q)
      );
    });
  }, [occupations, activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const current = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleTabChange = (tab: OccupationTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelected(null);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleEdit = (o: Occupation) => {
    setSelected(null);
    setEditing(o);
  };

  const handleSaveEdit = async (updated: Occupation) => {
    try {
      const saved = await occupationsApi.update(
        updated.numeroOccupation,
        updated
      );
      setOccupations((prev) =>
        prev.map((o) =>
          o.numeroOccupation === saved.numeroOccupation ? saved : o
        )
      );
      setEditing(null);
      setSelected(null);
    } catch (e: any) {
      toast.error("Échec de la modification", e.message || "Une erreur est survenue lors de la modification de l'occupation.");
      throw e;
    }
  };

  const handleDelete = async (o: Occupation) => {
    if (
      !(await confirmAction({
        title: "Confirmer la suppression",
        message: `Vous êtes sur le point de supprimer définitivement l'occupation « ${o.numeroOccupation} ». Cette action est irréversible.`,
        confirmLabel: "Supprimer",
        type: "warning",
      }))
    ) {
      return;
    }
    try {
      await occupationsApi.remove(o.numeroOccupation);
      setOccupations((prev) =>
        prev.filter((x) => x.numeroOccupation !== o.numeroOccupation)
      );
      setSelected(null);
      setEditing(null);
      toast.success("Occupation supprimée", `L'occupation ${o.numeroOccupation} a été supprimée avec succès.`);
    } catch (e: any) {
      toast.error("Échec de la suppression", e.message || "Une erreur est survenue lors de la suppression de l'occupation.");
    }
  };

  const handleValider = async (o: Occupation) => {
    if (
      !(await confirmAction({
        title: "Valider l'occupation",
        message: `Confirmez-vous la validation de l'occupation « ${o.numeroOccupation} » ? La demande associée passera au statut VALIDÉE.`,
        confirmLabel: "Valider l'occupation",
        type: "info",
      }))
    ) {
      return;
    }
    setValidatingId(o.numeroOccupation);
    try {
      if (typeof (occupationsApi as any).valider === "function") {
        await (occupationsApi as any).valider(o.numeroOccupation);
      } else {
        await occupationsApi.update(o.numeroOccupation, {
          statut: "APPROUVE",
        } as Partial<Occupation>);
      }
      await loadOccupations();
      setActiveTab("approuvees");
      toast.success("Occupation validée", `L'occupation ${o.numeroOccupation} a été validée avec succès.`);
    } catch (e: any) {
      toast.error("Échec de la validation", e.message || "Une erreur est survenue lors de la validation de l'occupation.");
    } finally {
      setValidatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="occupations-empty" style={{ padding: 48 }}>
        Chargement des occupations…
      </div>
    );
  }

  if (error) {
    return (
      <div className="occupations-empty" style={{ padding: 48 }}>
        <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>
        <button
          type="button"
          className="occupations-btn-primary"
          onClick={loadOccupations}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="occupations-page">
      {/* <div className="occupations-header">
        <div>
          <h2>Gestion des Occupations</h2>
          <p style={{ color: "#64748b", fontSize: 13 }}>
            Les occupations sont créées uniquement depuis l&apos;onglet{" "}
            <strong>Demandes</strong> (type Occupation). Validez-les ici, puis
            gérez les états des lieux.
          </p>
        </div>
        
      </div> */}

      <div className="occupations-tabs">
        {(Object.keys(TAB_LABELS) as OccupationTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`occupations-tab${activeTab === tab ? " active" : ""}`}
            onClick={() => handleTabChange(tab)}
          >
            {TAB_LABELS[tab]}
            <span className="occupations-tab-count">{counts[tab]}</span>
          </button>
        ))}
      </div>

      <div className="occupations-tab-banner">{TAB_BANNERS[activeTab]}</div>

      <div className="occupations-filters">
        <div className="occupations-search">
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
            placeholder="Rechercher par n°, bien, occupant, demande…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {current.length === 0 ? (
        <div className="occupations-empty">
          Aucune occupation dans « {TAB_LABELS[activeTab]} ».
        </div>
      ) : (
        <>
          <div className="occupations-table-wrap">
            <table className="occupations-table">
              <thead>
                <tr>
                  <th>N° Occupation</th>
                  <th>Bien</th>
                  <th>Occupant</th>
                  <th>Date entrée</th>
                  <th>Sortie prévue</th>
                  <th>Statut</th>
                  <th>Demande</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {current.map((o) => {
                  const st =
                    statutConfig[o.statut] || statutConfig.EN_ATTENTE;
                  const isDemandeTab = activeTab === "demandes";
                  const isApprouveesTab = activeTab === "approuvees";

                  return (
                    <tr
                      key={o.numeroOccupation}
                      onClick={() => setSelected(o)}
                    >
                      <td className="occupations-td-strong">
                        {o.numeroOccupation}
                      </td>
                      <td>
                        <div className="occupations-td-strong">
                          {o.bienNom || o.bienNumero}
                        </div>
                        {o.bienNom && (
                          <div className="occupations-td-muted">
                            {o.bienNumero}
                          </div>
                        )}
                      </td>
                      <td>{o.occupantNom || "—"}</td>
                      <td className="occupations-td-muted">
                        {formatDate(o.dateEntree)}
                      </td>
                      <td className="occupations-td-muted">
                        {formatDate(o.dateSortiePrevue)}
                      </td>
                      <td>
                        <span
                          className="occupations-badge"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="occupations-td-muted">
                        {o.demandeReference || "—"}
                      </td>
                      <td>
                        <div
                          className="occupations-td-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isDemandeTab &&
                            ["EN_ATTENTE", "EN_VALIDATION"].includes(
                              o.statut
                            ) && (
                              <button
                                type="button"
                                className="occupations-btn-icon"
                                title="Valider l'occupation"
                                disabled={validatingId === o.numeroOccupation}
                                onClick={() => handleValider(o)}
                              >
                                {validatingId === o.numeroOccupation
                                  ? "…"
                                  : "✓"}
                              </button>
                            )}

                          {isApprouveesTab &&
                            canGenerateEtatDesLieux(o.statut) && (
                              <button
                                type="button"
                                className="occupations-btn-icon"
                                title="État des lieux"
                                onClick={() => setEdlOccupation(o)}
                              >
                                📄
                              </button>
                            )}

                          {/* Plus de bouton 🔓 Demander libération */}

                          {activeTab !== "historique" && (
                            <button
                              type="button"
                              className="occupations-btn-icon"
                              title="Modifier"
                              onClick={() => handleEdit(o)}
                            >
                              ✎
                            </button>
                          )}

                          {activeTab !== "historique" && (
                            <button
                              type="button"
                              className="occupations-btn-icon danger"
                              title="Supprimer"
                              onClick={() => handleDelete(o)}
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="occupations-pagination">
              <button
                type="button"
                className="occupations-page-btn"
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
                    className={`occupations-page-num${
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
                className="occupations-page-btn"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Suivant →
              </button>
            </div>
          )}

          <div className="occupations-pagination-info">
            Page {currentPage} sur {totalPages} — Affichage de{" "}
            {filtered.length === 0 ? 0 : startIndex + 1} à{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} sur{" "}
            {filtered.length}
          </div>
        </>
      )}

      {selected && (
        <OccupationDetailModal
          occupation={selected}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={loadOccupations}
        />
      )}

      {editing && (
        <OccupationForm
          mode="edit"
          occupation={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}

      {edlOccupation && (
        <EtatDesLieuxForm
          occupation={edlOccupation}
          onClose={() => setEdlOccupation(null)}
        />
      )}
    </div>
  );
}