"use client";

import React from "react";
import { TypeDemande, StatutDemande } from "../types/demande";

const typeLabel: Record<TypeDemande, string> = {
  OCCUPATION: "Occupation",
  LIBERATION: "Libération",
  BAIL: "Bail",
  ATTESTATION: "Attestation",
  RECENSEMENT: "Recensement",
  TRAVAUX: "Travaux",
};

const statutLabel: Record<StatutDemande, string> = {
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  VALIDEE: "Validée",
  REJETEE: "Rejetée",
  TERMINEE: "Terminée",
};

interface Props {
  search: string;
  filtreType: string;
  filtreStatut: string;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onStatutChange: (value: string) => void;
}

export default function DemandesFilters({
  search,
  filtreType,
  filtreStatut,
  onSearchChange,
  onTypeChange,
  onStatutChange,
}: Props) {
  return (
    <div className="demandes-filters">
      <div className="demandes-search">
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
          placeholder="Rechercher par réf., demandeur, description..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <select
        className="demandes-select"
        value={filtreType}
        onChange={(e) => onTypeChange(e.target.value)}
      >
        <option value="TOUS">Tous les types</option>
        {Object.entries(typeLabel).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      <select
        className="demandes-select"
        value={filtreStatut}
        onChange={(e) => onStatutChange(e.target.value)}
      >
        <option value="TOUS">Tous les statuts</option>
        {Object.entries(statutLabel).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}