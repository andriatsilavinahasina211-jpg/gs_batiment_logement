import React from "react";
import type { Occupation } from "../../occupations/types";
import {
  formatDate,
  canDemanderLiberation,
  canValiderLiberation,
} from "../../occupations/constants";
import type { Tab } from "../constants";
import { StatutBadge } from "./StatutBadge";

type LiberationsTableProps = {
  items: Occupation[];
  activeTab: Tab;
  refusingId: string | null;
  canValidateLiberation: boolean;
  onSelect: (o: Occupation) => void;
  onDemander: (o: Occupation) => void;
  onValider: (o: Occupation) => void;
  onRefuser: (o: Occupation) => void;
};

export function LiberationsTable({
  items,
  activeTab,
  refusingId,
  canValidateLiberation,
  onSelect,
  onDemander,
  onValider,
  onRefuser,
}: LiberationsTableProps) {
  if (items.length === 0) {
    const emptyMessage =
      activeTab === "en_cours"
        ? "Aucune occupation en cours éligible à une libération."
        : activeTab === "demandes"
          ? "Aucune demande de libération en attente."
          : "Aucun historique de libération.";

    return <div className="occupations-empty">{emptyMessage}</div>;
  }

  return (
    <div className="occupations-table-wrap">
      <table className="occupations-table">
        <thead>
          <tr>
            <th>N° Occupation</th>
            <th>Bien</th>
            <th>Occupant</th>
            <th>Date entrée</th>
            <th>Sortie prévue</th>
            <th>Statut</th>
            {activeTab !== "en_cours" && <th>Motif / Infos</th>}
            {activeTab === "demandes" && canValidateLiberation && (
              <th>Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((o) => {
            const isRefusing = refusingId === o.numeroOccupation;
            return (
              <tr
                key={o.numeroOccupation}
                onClick={() => onSelect(o)}
                style={{ cursor: "pointer" }}
              >
                <td className="occupations-td-strong">{o.numeroOccupation}</td>
                <td>
                  <div className="occupations-td-strong">
                    {o.bienNom || o.bienNumero}
                  </div>
                  {o.bienNom && (
                    <div className="occupations-td-muted">{o.bienNumero}</div>
                  )}
                </td>
                <td>{o.occupantNom || "—"}</td>
                <td className="occupations-td-muted">
                  {formatDate(o.dateEntree)}
                </td>
                <td className="occupations-td-muted">
                  {formatDate(o.dateSortiePrevue)}
                </td>
                <td>
                  <StatutBadge statut={o.statut} />
                </td>
                {activeTab !== "en_cours" && (
                  <td className="occupations-td-muted">
                    {o.motifLiberation && (
                      <div title={o.motifLiberation} style={{ fontSize: 12 }}>
                        {o.motifLiberation.length > 40
                          ? o.motifLiberation.slice(0, 40) + "…"
                          : o.motifLiberation}
                      </div>
                    )}
                    {o.dateSortieReelle && (
                      <div
                        style={{
                          fontSize: 11,
                          marginTop: 2,
                          color: "#16a34a",
                        }}
                      >
                        Sortie réelle : {formatDate(o.dateSortieReelle)}
                      </div>
                    )}
                  </td>
                )}
                {activeTab === "demandes" && canValidateLiberation && (
                  <td onClick={(event) => event.stopPropagation()}>
                    {canValiderLiberation(o.statut) && (
                      <button
                        type="button"
                        className="occupations-btn-primary"
                        disabled={isRefusing}
                        onClick={() => onValider(o)}
                      >
                        Valider la libération
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}