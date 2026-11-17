import React from "react";
import { statutConfig } from "../constants";

type SearchFiltersProps = {
  search: string;
  filtreStatut: string;
  onSearchChange: (value: string) => void;
  onStatutChange: (value: string) => void;
};

export function SearchFilters({
  search,
  filtreStatut,
  onSearchChange,
  onStatutChange,
}: SearchFiltersProps) {
  return (
    <div className="baux-filters">
      <div className="baux-search">
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
          placeholder="Rechercher par n°, bien, locataire..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <select
        className="baux-select"
        value={filtreStatut}
        onChange={(e) => onStatutChange(e.target.value)}
      >
        <option value="TOUS">Tous les statuts</option>
        {Object.entries(statutConfig).map(([key, { label }]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}