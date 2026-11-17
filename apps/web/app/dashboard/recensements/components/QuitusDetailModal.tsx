"use client";

import React, { useState } from "react";
import type { Quitus } from "../types";
import { statutQuitusConfig } from "./QuitusFilters";
import { etatConfig } from "./QuitusTable";
import { formatDate } from "./CampagneBanner";

interface Props {
  quitus: Quitus;
  onClose: () => void;
  onValider: (id: string) => Promise<void>;
  canValider: boolean;
}

export default function QuitusDetailModal({
  quitus,
  onClose,
  onValider,
  canValider,
}: Props) {
  const [validating, setValidating] = useState(false);
  const st = statutQuitusConfig[quitus.statut];
  const et = quitus.etatBatiment ? etatConfig[quitus.etatBatiment] : null;

  const bienNom = quitus.bien?.nomDuBien || quitus.bienNumero;
  const occupant = quitus.occupant;

  const handleValider = async () => {
    setValidating(true);
    try {
      await onValider(quitus.id);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="recensement-modal-overlay" onClick={onClose}>
      <div
        className="recensement-detail-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 580 }}
      >
        <div className="recensement-detail-header">
          <div>
            <h2>{quitus.reference}</h2>
            <p>
              Recensement Année {quitus.annee} · {bienNom}
            </p>
          </div>
          <button className="recensement-detail-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="recensement-detail-body">
          <div className="recensement-detail-infos">
            <div className="recensement-info-row">
              <span className="recensement-info-label">Statut</span>
              <span
                className="recensement-badge"
                style={{ background: st?.bg || "#f1f5f9", color: st?.color || "#64748b" }}
              >
                {st?.label || quitus.statut}
              </span>
            </div>

            <div className="recensement-info-row">
              <span className="recensement-info-label">Année</span>
              <span className="recensement-info-value">{quitus.annee}</span>
            </div>

            <div className="recensement-info-row">
              <span className="recensement-info-label">Bien</span>
              <span className="recensement-info-value">
                <strong>{bienNom}</strong> ({quitus.bienNumero})
              </span>
            </div>

            {quitus.bien?.adresse && (
              <div className="recensement-info-row">
                <span className="recensement-info-label">Adresse</span>
                <span className="recensement-info-value">{quitus.bien.adresse}</span>
              </div>
            )}

            <div className="recensement-info-row">
              <span className="recensement-info-label">Occupant</span>
              <span className="recensement-info-value">
                {occupant
                  ? `${occupant.nom} ${occupant.prenom}${
                      occupant.matricule ? ` (${occupant.matricule})` : ""
                    }`
                  : "Aucun occupant recensé (Vacant)"}
              </span>
            </div>

            {et && (
              <div className="recensement-info-row">
                <span className="recensement-info-label">État du bâtiment</span>
                <span
                  className="recensement-info-value"
                  style={{ color: et.color, fontWeight: 700 }}
                >
                  {et.label}
                </span>
              </div>
            )}

            <div className="recensement-info-row">
              <span className="recensement-info-label">Recensé par</span>
              <span className="recensement-info-value">
                {quitus.createdBy
                  ? `${quitus.createdBy.prenom} ${quitus.createdBy.nom}`
                  : "Agent SRB"}
              </span>
            </div>

            <div className="recensement-info-row">
              <span className="recensement-info-label">Date d&apos;enregistrement</span>
              <span className="recensement-info-value">
                {formatDate(quitus.createdAt)}
              </span>
            </div>

            {quitus.observations && (
              <div style={{ marginTop: 8 }}>
                <div className="recensement-info-label">Observations de l&apos;agent</div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text)",
                    lineHeight: 1.5,
                    marginTop: 4,
                    background: "var(--bg)",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}
                >
                  {quitus.observations}
                </div>
              </div>
            )}

            {/* Snapshot métier */}
            {quitus.donneesSnapshot && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                  Snapshot certifié lors du recensement
                </div>
                <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
                  Type : {quitus.donneesSnapshot.bien?.typeBien || "Logement / Bâtiment"} · 
                  Statut : {quitus.donneesSnapshot.bien?.statut || "N/A"}
                </div>
              </div>
            )}
          </div>

          <div className="recensement-detail-actions" style={{ justifyContent: "space-between" }}>
            <button
              type="button"
              className="recensement-btn-secondary"
              onClick={onClose}
            >
              Fermer
            </button>

            {canValider && quitus.statut === "BROUILLON" && (
              <button
                type="button"
                className="recensement-btn-submit"
                style={{ background: "#16a34a" }}
                disabled={validating}
                onClick={handleValider}
              >
                {validating ? "Validation..." : "✓ Valider ce quitus"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

