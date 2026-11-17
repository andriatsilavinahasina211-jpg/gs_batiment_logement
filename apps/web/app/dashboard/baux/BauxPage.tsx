"use client";

import React from "react";
import "./BauxPage.css";
import { useBaux, type BailTab } from "./hooks/useBaux";
import { SearchFilters } from "./components/SearchFilters";
import { BauxTable } from "./components/BauxTable";
import { Pagination } from "./components/Pagination";
import { BailDetailModal } from "./components/BailDetailModal";
import { BailForm } from "./components/BailForm";

const TAB_LABELS: Record<BailTab, string> = {
  demandes: "Circuit / en attente",
  en_cours: "En cours",
  historique: "Historique",
};

const TAB_BANNERS: Record<BailTab, string> = {
  demandes:
    "Baux en circuit réglementaire (Accord MEF, Visa CF, validation SRB).",
  en_cours: "Contrats de bail actifs (statut EN_COURS).",
  historique: "Baux terminés, renouvelés ou résiliés.",
};

export default function BauxPage() {
  const {
    loading,
    error,
    current,
    filtered,
    counts,
    totalPages,
    activeTab,
    search,
    currentPage,
    selected,
    editing,
    loadBaux,
    setCurrentPage,
    setSelected,
    setEditing,
    handleTabChange,
    handleSearchChange,
    handleEdit,
    handleSaveEdit,
    handleDelete,
  } = useBaux();

  if (loading) {
    return (
      <div className="baux-empty" style={{ padding: 48 }}>
        Chargement des baux…
      </div>
    );
  }

  if (error) {
    return (
      <div className="baux-empty" style={{ padding: 48 }}>
        <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>
        <button type="button" className="baux-btn-primary" onClick={loadBaux}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="baux-page">
      <div className="baux-header">
        <div>
          <h2>Gestion des Baux</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
            Les baux sont créés depuis l&apos;onglet{" "}
            <strong>Demandes</strong> (type contrat de bail).{" "}
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""} sur cet
            onglet.
          </p>
        </div>
      </div>

      <div className="baux-tabs">
        {(Object.keys(TAB_LABELS) as BailTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`baux-tab${activeTab === tab ? " active" : ""}`}
            onClick={() => handleTabChange(tab)}
          >
            {TAB_LABELS[tab]}
            <span className="baux-tab-count">{counts[tab]}</span>
          </button>
        ))}
      </div>

      <div className="baux-tab-banner">{TAB_BANNERS[activeTab]}</div>

      <SearchFilters
        search={search}
        filtreStatut="TOUS"
        onSearchChange={handleSearchChange}
        onStatutChange={() => {}}
      />

      <BauxTable
        items={current}
        onSelect={setSelected}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {current.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
        />
      )}

      {selected && (
        <BailDetailModal
          bail={selected}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={loadBaux}
        />
      )}

      {editing && (
        <BailForm
          mode="edit"
          bail={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}