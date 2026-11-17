"use client";

import React from "react";
import { Demande, StatutDemande, TypeDemande } from "../types/demande";

const statutConfig: Record<
  StatutDemande,
  { label: string; color: string; bg: string }
> = {
  EN_ATTENTE: { label: "En attente", color: "#64748b", bg: "#f1f5f9" },
  EN_COURS: { label: "En cours", color: "#2563eb", bg: "#eff6ff" },
  VALIDEE: { label: "Validée", color: "#16a34a", bg: "#dcfce7" },
  REJETEE: { label: "Rejetée", color: "#dc2626", bg: "#fee2e2" },
  TERMINEE: { label: "Terminée", color: "#A67C00", bg: "#fefce8" },
};

const typeLabel: Record<TypeDemande, string> = {
  OCCUPATION: "Occupation",
  LIBERATION: "Libération",
  BAIL: "Bail",
  ATTESTATION: "Attestation",
  RECENSEMENT: "Recensement",
  TRAVAUX: "Travaux",
};

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
}

interface Props {
  demandes: Demande[];
  onSelect: (d: Demande) => void;
  onEdit: (d: Demande) => void;
  onDelete: (d: Demande) => void;
}

export default function DemandesTable({
  demandes,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="demandes-table-wrap">
      <table className="demandes-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Type</th>
            <th>Demandeur</th>
            <th>Bien</th>
            <th>Date</th>
            <th>Statut</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {demandes.map((d) => {
            const st = statutConfig[d.statut];
            return (
              <tr key={d.reference} onClick={() => onSelect(d)}>
                <td className="demandes-td-strong">{d.reference}</td>
                <td>
                  <span className="demandes-type-badge">
                    {typeLabel[d.typeDemande]}
                  </span>
                </td>
                <td>
                  {d.demandeur
                    ? `${d.demandeur.nom} ${d.demandeur.prenom}`
                    : "—"}
                </td>
                <td>
                  {d.bien ? (
                    <>
                      <div className="demandes-td-strong">{d.bien.nomDuBien}</div>
                      <div className="demandes-td-muted">{d.bien.numeroBien}</div>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="demandes-td-muted">
                  {formatDate(d.createdAt)}
                </td>
                <td>
                  <span
                    className="demandes-badge"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                </td>
                <td>
                  <div
                    className="demandes-td-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="demandes-btn-icon"
                      title="Modifier"
                      onClick={() => onEdit(d)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="demandes-btn-icon danger"
                      title="Supprimer"
                      onClick={() => onDelete(d)}
                    >
                      🗑
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