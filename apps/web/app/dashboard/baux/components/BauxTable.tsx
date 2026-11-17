import React from "react";
import type { Bail } from "../types";
import { formatDate, formatMoney } from "../constants";
import { StatutBadge } from "./StatutBadge";

type BauxTableProps = {
  items: Bail[];
  onSelect: (b: Bail) => void;
  onEdit: (b: Bail) => void;
  onDelete: (b: Bail) => void;
};

export function BauxTable({ items, onSelect, onEdit, onDelete }: BauxTableProps) {
  if (items.length === 0) {
    return (
      <div className="baux-empty">
        Aucun bail ne correspond à votre recherche.
      </div>
    );
  }

  return (
    <div className="baux-table-wrap">
      <table className="baux-table">
        <thead>
          <tr>
            <th>N° Bail</th>
            <th>Bien</th>
            <th>Locataire</th>
            <th>Début</th>
            <th>Fin</th>
            <th>Loyer</th>
            <th>Statut</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.numeroBail} onClick={() => onSelect(b)}>
              <td className="baux-td-strong">{b.numeroBail}</td>
              <td>
                <div className="baux-td-strong">{b.bienNom || b.bienNumero}</div>
                {b.bienNom && (
                  <div className="baux-td-muted">{b.bienNumero}</div>
                )}
              </td>
              <td>{b.locataireNom || "—"}</td>
              <td className="baux-td-muted">{formatDate(b.dateDebut)}</td>
              <td className="baux-td-muted">{formatDate(b.dateFin)}</td>
              <td className="baux-td-strong">{formatMoney(b.montantLoyer)}</td>
              <td>
                <StatutBadge statut={b.statut} />
              </td>
              <td>
                <div
                  className="baux-td-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="baux-btn-icon"
                    title="Modifier"
                    onClick={() => onEdit(b)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="baux-btn-icon danger"
                    title="Supprimer"
                    onClick={() => onDelete(b)}
                  >
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}