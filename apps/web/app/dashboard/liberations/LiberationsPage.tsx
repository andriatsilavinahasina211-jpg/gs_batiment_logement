"use client";

import React, { useEffect, useState } from "react";
import "../occupations/OccupationsPage.css";
import { OccupationDetailModal } from "../occupations/OccupationDetailModal";
import { LiberationForm } from "../occupations/LiberationForm";
import { useLiberations } from "./hooks/useLiberations";
import { getStoredUser } from "../../lib/auth";
import { TabBar } from "./components/TabBar";
import { TabBanner } from "./components/TabBanner";
import { SearchBar } from "./components/SearchBar";
import { LiberationsTable } from "./components/LiberationsTable";
import { Pagination } from "./components/Pagination";

export default function LiberationsPage() {
  const [canValidateLiberation, setCanValidateLiberation] = useState(false);
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
    liberationTarget,
    refusingId,
    loadOccupations,
    handleTabChange,
    handleSearchChange,
    setCurrentPage,
    setSelected,
    openValider,
    handleRefuser,
    closeLiberationForm,
    handleLiberationSuccess,
  } = useLiberations();

  useEffect(() => {
    const role = getStoredUser()?.role;
    setCanValidateLiberation(
      role === "CHEF_SRB" || role === "ADMINISTRATEUR"
    );
  }, []);

  if (loading) {
    return (
      <div className="occupations-empty" style={{ padding: 48 }}>
        Chargement des libérations…
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
      <div className="occupations-header">
        <div>
          <h2>Gestion des Libérations</h2>
          <p style={{ color: "#64748b", fontSize: 13 }}>
            Les demandes de libération sont créées depuis l&apos;onglet{" "}
            <strong>Demandes</strong>. Validez ou refusez-les ici.
          </p>
        </div>
      </div>

      <TabBar
        activeTab={activeTab}
        counts={counts}
        onChange={handleTabChange}
      />

      <TabBanner activeTab={activeTab} />

      <SearchBar value={search} onChange={handleSearchChange} />

      <LiberationsTable
        items={current}
        activeTab={activeTab}
        refusingId={refusingId}
        canValidateLiberation={canValidateLiberation}
        onSelect={setSelected}
        onDemander={() => {}}
        onValider={openValider}
        onRefuser={handleRefuser}
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
        <OccupationDetailModal
          occupation={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {}}
          onDelete={() => {}}
          onRefresh={loadOccupations}
        />
      )}

      {liberationTarget && liberationTarget.mode === "valider" && (
        <LiberationForm
          occupation={liberationTarget.occupation}
          mode="valider"
          onClose={closeLiberationForm}
          onSuccess={handleLiberationSuccess}
        />
      )}
    </div>
  );
}