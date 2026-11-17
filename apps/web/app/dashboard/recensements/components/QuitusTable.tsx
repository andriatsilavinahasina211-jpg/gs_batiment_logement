"use client";

import React from "react";
import type { Quitus, EtatBatisse } from "../types";
import { statutQuitusConfig } from "./QuitusFilters";

export const etatConfig: Record<EtatBatisse, { label: string; color: string }> = {
  BON: { label: "Bon", color: "#16a34a" },
  MOYEN: { label: "Moyen", color: "#d97706" },
  MAUVAIS: { label: "Mauvais", color: "#dc2626" },
};

interface Props {
  quitus: Quitus[];
  onSelect: (q: Quitus) => void;
  onValider?: (q: Quitus) => void;
  canValider: boolean;
}

export default function QuitusTable({
  quitus,
  onSelect,
  onValider,
  canValider,
}: Props) {
  if (quitus.length === 0) {
    return (
      <div className="recensement-empty">
        Aucun quitus de recensement ne correspond aux critères.
      </div>
    );
  }

  return (
    <div className="recensement-table-wrap">
      <table className="recensement-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Année</th>
            <th>Bien</th>
            <th>Occupant</th>
            <th>État Bâtisse</th>
            <th>Statut</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {quitus.map((q) => {
            const st = statutQuitusConfig[q.statut] || {
              label: q.statut,
              color: "#64748b",
              bg: "#f1f5f9",
            };
            const et = q.etatBatiment ? etatConfig[q.etatBatiment] : null;
            const bienNom = q.bien?.nomDuBien;
            const occupantNom = q.occupant
              ? `${q.occupant.nom} ${q.occupant.prenom}`
              : null;

            return (
              <tr key={q.id} onClick={() => onSelect(q)}>
                <td className="recensement-td-strong">{q.reference}</td>
                <td>{q.annee}</td>
                <td>
                  <div className="recensement-td-strong">
                    {bienNom || q.bienNumero}
                  </div>
                  {bienNom && (
                    <div className="recensement-td-muted">{q.bienNumero}</div>
                  )}
                </td>
                <td>{occupantNom || "—"}</td>
                <td>
                  {et ? (
                    <span style={{ fontWeight: 600, color: et.color }}>
                      {et.label}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <span
                    className="recensement-badge"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                </td>
                <td>
                  <div
                    className="recensement-td-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canValider && q.statut === "BROUILLON" && onValider && (
                      <button
                        type="button"
                        className="recensement-btn-icon"
                        title="Valider le quitus"
                        style={{ color: "#16a34a" }}
                        onClick={() => onValider(q)}
                      >
                        ✓
                      </button>
                    )}
                    <button
                      type="button"
                      className="recensement-btn-icon"
                      title="Voir les détails"
                      onClick={() => onSelect(q)}
                    >
                      👁
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

