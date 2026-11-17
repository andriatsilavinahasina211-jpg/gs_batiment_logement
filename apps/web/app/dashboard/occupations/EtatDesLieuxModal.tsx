"use client";

import { useState } from "react";
import type { Occupation } from "./types";
import { formatDate } from "./constants";
import { occupationsApi } from "./api";
import { useFeedback } from "../shared/feedback";

interface EtatDesLieuxModalProps {
  occupation: Occupation;
  onClose: () => void;
}

export function EtatDesLieuxModal({
  occupation,
  onClose,
}: EtatDesLieuxModalProps) {
  const { toast } = useFeedback();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Appel API ou logique de génération PDF
      // Pour l'instant, simule un délai de génération
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setGenerated(true);
    } catch (e: unknown) {
      toast.error(
        "Échec de la génération",
        e instanceof Error ? e.message : "Erreur lors de la génération du PDF"
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="occupations-modal-overlay" onClick={onClose}>
      <div
        className="occupations-detail-modal"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="occupations-detail-header">
          <div>
            <h2>📄 État des lieux</h2>
            <p>
              {occupation.numeroOccupation} ·{" "}
              {occupation.bienNom || occupation.bienNumero}
            </p>
          </div>
          <button className="occupations-detail-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Corps */}
        <div className="occupations-detail-body">
          <div className="occupations-detail-infos">
            <div className="occupations-info-row">
              <span className="occupations-info-label">N° Occupation</span>
              <span className="occupations-info-value">
                {occupation.numeroOccupation}
              </span>
            </div>
            <div className="occupations-info-row">
              <span className="occupations-info-label">Bien</span>
              <span className="occupations-info-value">
                {occupation.bienNom || occupation.bienNumero}
              </span>
            </div>
            {occupation.occupantNom && (
              <div className="occupations-info-row">
                <span className="occupations-info-label">Occupant</span>
                <span className="occupations-info-value">
                  {occupation.occupantNom}
                </span>
              </div>
            )}
            <div className="occupations-info-row">
              <span className="occupations-info-label">Date d'entrée</span>
              <span className="occupations-info-value">
                {formatDate(occupation.dateEntree)}
              </span>
            </div>
            {occupation.dateSortiePrevue && (
              <div className="occupations-info-row">
                <span className="occupations-info-label">Sortie prévue</span>
                <span className="occupations-info-value">
                  {formatDate(occupation.dateSortiePrevue)}
                </span>
              </div>
            )}
            <div className="occupations-info-row">
              <span className="occupations-info-label">Clés restituées</span>
              <span className="occupations-info-value">
                {occupation.clesRestituees ? "Oui" : "Non"}
              </span>
            </div>
          </div>

          {generated && (
            <p
              style={{
                marginTop: 12,
                color: "#16a34a",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              ✅ PDF généré avec succès.
            </p>
          )}

          {/* Actions */}
          <div className="occupations-detail-actions">
            {!generated ? (
              <button
                className="occupations-btn-primary"
                disabled={generating}
                onClick={handleGenerate}
              >
                {generating ? "Génération…" : "📄 Générer le PDF"}
              </button>
            ) : (
              <button className="occupations-btn-primary" onClick={onClose}>
                Fermer
              </button>
            )}
            <button
              className="occupations-btn-secondary"
              onClick={onClose}
              disabled={generating}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
