"use client";

import React from "react";
import type { StatutQuitus } from "../types";

export const statutQuitusConfig: Record<
  StatutQuitus,
  { label: string; color: string; bg: string }
> = {
  BROUILLON: { label: "Brouillon", color: "#64748b", bg: "#f1f5f9" },
  VALIDE: { label: "Validé", color: "#16a34a", bg: "#dcfce7" },
  GENERE: { label: "Généré", color: "#2563eb", bg: "#eff6ff" },
};

interface Props {
  search: string;
  filtreAnnee: string;
  filtreStatut: string;
  annees: number[];
  onSearchChange: (val: string) => void;
  onAnneeChange: (val: string) => void;
  onStatutChange: (val: string) => void;
}

export default function QuitusFilters({
  search,
  filtreAnnee,
  filtreStatut,
  annees,
  onSearchChange,
  onAnneeChange,
  onStatutChange,
}: Props) {
  return (
    <div className="recensement-filters">
      <div className="recensement-search">
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
          placeholder="Rechercher par réf., bien, occupant..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <select
        className="recensement-select"
        value={filtreAnnee}
        onChange={(e) => onAnneeChange(e.target.value)}
      >
        <option value="TOUS">Toutes les années</option>
        {annees.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <select
        className="recensement-select"
        value={filtreStatut}
        onChange={(e) => onStatutChange(e.target.value)}
      >
        <option value="TOUS">Tous les statuts</option>
        {Object.entries(statutQuitusConfig).map(([key, { label }]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

