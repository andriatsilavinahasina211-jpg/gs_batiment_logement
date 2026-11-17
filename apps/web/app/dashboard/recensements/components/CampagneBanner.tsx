"use client";

import React from "react";
import type { CampagneRecensement } from "../types";

interface Props {
  campagnes: CampagneRecensement[];
  activeCampagne: CampagneRecensement | null;
  onSelectCampagne: (c: CampagneRecensement) => void;
  onNewCampagne: () => void;
  onCloturer: (id: string) => void;
  canManage: boolean;
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
}

export default function CampagneBanner({
  campagnes,
  activeCampagne,
  onSelectCampagne,
  onNewCampagne,
  onCloturer,
  canManage,
}: Props) {
  if (!activeCampagne) {
    return (
      <div
        className="recensement-campagne-banner"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          background: "#fffbeb",
          border: "1px dashed #fde68a",
          borderRadius: 12,
        }}
      >
        <div>
          <strong style={{ color: "#92400e" }}>Aucune campagne active</strong>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#b45309" }}>
            Aucune campagne de recensement n&apos;est actuellement ouverte.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            className="recensement-btn-primary"
            onClick={onNewCampagne}
          >
            + Lancer une campagne
          </button>
        )}
      </div>
    );
  }

  const isOuverte = activeCampagne.statut === "OUVERTE";

  return (
    <div className="recensement-campagne-banner">
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <strong>Campagne de Recensement {activeCampagne.annee}</strong>
          <span
            className="recensement-badge"
            style={{
              background: isOuverte ? "var(--green-bg)" : "var(--bg)",
              color: isOuverte ? "var(--green)" : "var(--muted)",
            }}
          >
            {isOuverte
              ? "Ouverte"
              : activeCampagne.statut === "CLOTUREE"
              ? "Clôturée"
              : "Archivée"}
          </span>

          {campagnes.length > 1 && (
            <select
              className="recensement-select"
              style={{ padding: "4px 8px", fontSize: 12 }}
              value={activeCampagne.id}
              onChange={(e) => {
                const found = campagnes.find((c) => c.id === e.target.value);
                if (found) onSelectCampagne(found);
              }}
            >
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>
                  Année {c.annee} ({c.statut})
                </option>
              ))}
            </select>
          )}
        </div>

        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Ouverte le {formatDate(activeCampagne.dateOuverture)}
          {activeCampagne.dateCloture
            ? ` — Clôture prévue : ${formatDate(activeCampagne.dateCloture)} (limite réglementaire : 30 juin)`
            : ""}
          {activeCampagne._count?.quitus !== undefined
            ? ` · ${activeCampagne._count.quitus} quitus enregistré(s)`
            : ""}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {canManage && isOuverte && (
          <button
            type="button"
            className="recensement-btn-secondary"
            style={{ fontSize: 12, padding: "6px 12px" }}
            onClick={() => onCloturer(activeCampagne.id)}
          >
            Clôturer la campagne
          </button>
        )}
        {canManage && (
          <button
            type="button"
            className="recensement-btn-primary"
            style={{ fontSize: 12, padding: "6px 12px" }}
            onClick={onNewCampagne}
          >
            + Nouvelle campagne
          </button>
        )}
      </div>
    </div>
  );
}

