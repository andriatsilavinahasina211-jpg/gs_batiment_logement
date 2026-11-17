"use client";

import React from "react";
import type { TypeNotification } from "../types";

export type FilterTab = "TOUTES" | "NON_LUES" | TypeNotification;

interface Props {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  search: string;
  onSearchChange: (val: string) => void;
  counts: Record<FilterTab, number>;
}

const TABS: { key: FilterTab; label: string }[] = [
  { key: "TOUTES", label: "Toutes" },
  { key: "NON_LUES", label: "Non lues" },
  { key: "ALERTE_DELAI", label: "Alertes Délais" },
  { key: "VALIDATION", label: "Validations" },
  { key: "RETARD_TRAVAUX", label: "Chantiers" },
  { key: "RECENSEMENT", label: "Recensement" },
  { key: "SYSTEME", label: "Système" },
];

export default function NotificationFilters({
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  counts,
}: Props) {
  return (
    <div className="notif-filters-bar">
      <div className="notif-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`notif-tab${activeTab === t.key ? " active" : ""}`}
            onClick={() => onTabChange(t.key)}
          >
            <span>{t.label}</span>
            <span className="notif-tab-badge">{counts[t.key] || 0}</span>
          </button>
        ))}
      </div>

      <div className="notif-search-row">
        <div className="notif-search-input-wrap">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Filtrer les alertes par mot-clé, référence ou sujet..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#94a3b8",
                padding: "2px 6px",
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

