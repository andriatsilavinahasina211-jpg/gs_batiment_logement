"use client";

import { useState } from "react";
import type { Occupation } from "./types";
import {
  statutConfig,
  formatDate,
  canGenerateEtatDesLieux,
} from "./constants";
import { occupationsApi } from "./api";
import { EtatDesLieuxForm } from "./EtatDesLieuxForm";
import { LiberationForm } from "./LiberationForm"; // ← nouveau composant
import { useFeedback } from "../shared/feedback";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="occupations-info-row">
      <span className="occupations-info-label">{label}</span>
      <span className="occupations-info-value">{value}</span>
    </div>
  );
}

export function OccupationDetailModal({
  occupation,
  onClose,
  onEdit,
  onDelete,
  onRefresh,
}: {
  occupation: Occupation;
  onClose: () => void;
  onEdit: (o: Occupation) => void;
  onDelete: (o: Occupation) => void;
  onRefresh?: () => void;
}) {
  const { toast, confirmAction, promptAction } = useFeedback();
  const st = statutConfig[occupation.statut] || statutConfig.EN_ATTENTE;
  const [loadingAction, setLoadingAction] = useState(false);
  const [showEdl, setShowEdl] = useState(false);
  const [showLiberation, setShowLiberation] = useState<"demander" | "valider" | null>(null);

  const canGenerateEdl = canGenerateEtatDesLieux(occupation.statut);

  const handleApprouver = async () => {
    if (!(await confirmAction({
      title: "Approuver l’occupation",
      message: `Confirmez-vous l’approbation de l’occupation « ${occupation.numeroOccupation} » ?`,
      confirmLabel: "Approuver",
      type: "info",
    }))) {
      return;
    }
    setLoadingAction(true);
    try {
      await occupationsApi.update(occupation.numeroOccupation, {
        statut: "APPROUVE",
      });
      onRefresh?.();
      onClose();
    } catch (e: unknown) {
      toast.error(
        "Échec de l’approbation",
        e instanceof Error ? e.message : "Erreur lors de l'approbation"
      );
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRejeter = async () => {
    const motif = await promptAction({
      title: "Rejeter l’occupation",
      message: `Indiquez éventuellement le motif du rejet de l’occupation « ${occupation.numeroOccupation} ».`,
      input: {
        label: "Motif du rejet",
        placeholder: "Saisir un motif (facultatif)",
      },
      confirmLabel: "Rejeter",
      type: "danger",
    });
    if (motif === null) return;

    setLoadingAction(true);
    try {
      await occupationsApi.update(occupation.numeroOccupation, {
        statut: "EN_ATTENTE",
        motifLiberation: motif || occupation.motifLiberation,
      });
      onRefresh?.();
      onClose();
    } catch (e: unknown) {
      toast.error(
        "Échec du rejet",
        e instanceof Error ? e.message : "Erreur lors du rejet"
      );
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePasserEnCours = async () => {
    setLoadingAction(true);
    try {
      await occupationsApi.update(occupation.numeroOccupation, {
        statut: "EN_COURS",
      });
      onRefresh?.();
      onClose();
    } catch (e: unknown) {
      toast.error(
        "Échec du changement de statut",
        e instanceof Error ? e.message : "Erreur lors du changement de statut"
      );
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRefuserLiberation = async () => {
    if (!(await confirmAction({
      title: "Refuser la demande de libération",
      message: `Confirmez-vous le refus de la demande de libération pour « ${occupation.numeroOccupation} » ?`,
      confirmLabel: "Refuser la libération",
      type: "danger",
    }))) return;

    setLoadingAction(true);
    try {
      await occupationsApi.refuserLiberation(occupation.numeroOccupation);
      onRefresh?.();
      onClose();
    } catch (e: unknown) {
      toast.error(
        "Échec du refus",
        e instanceof Error ? e.message : "Erreur lors du refus de la libération"
      );
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="occupations-modal-overlay" onClick={onClose}>
      <div
        className="occupations-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="occupations-detail-header">
          <div>
            <h2>{occupation.numeroOccupation}</h2>
            <p>
              {occupation.bienNom || occupation.bienNumero}
              {occupation.occupantNom ? ` · ${occupation.occupantNom}` : ""}
            </p>
          </div>
          <button className="occupations-detail-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="occupations-detail-body">
          <div className="occupations-detail-infos">
            <div className="occupations-info-row">
              <span className="occupations-info-label">Statut</span>
              <span
                className="occupations-badge"
                style={{ background: st.bg, color: st.color }}
              >
                {st.label}
              </span>
            </div>
            <InfoRow label="N° Bien" value={occupation.bienNumero} />
            {occupation.bienNom && (
              <InfoRow label="Bien" value={occupation.bienNom} />
            )}
            {occupation.occupantNom && (
              <InfoRow label="Occupant" value={occupation.occupantNom} />
            )}
            <InfoRow
              label="Date d'entrée"
              value={formatDate(occupation.dateEntree)}
            />
            <InfoRow
              label="Sortie prévue"
              value={formatDate(occupation.dateSortiePrevue)}
            />
            <InfoRow
              label="Sortie réelle"
              value={formatDate(occupation.dateSortieReelle)}
            />
            {occupation.delaiJouissanceMois != null && (
              <InfoRow
                label="Délai jouissance"
                value={`${occupation.delaiJouissanceMois} mois`}
              />
            )}
            {occupation.motifLiberation && (
              <InfoRow
                label="Motif libération"
                value={occupation.motifLiberation}
              />
            )}
            <InfoRow
              label="Clés restituées"
              value={occupation.clesRestituees ? "Oui" : "Non"}
            />
            <InfoRow
              label="Procédure judiciaire"
              value={occupation.procedureJudiciaire ? "Oui" : "Non"}
            />
          </div>

          <div className="occupations-detail-actions">
            {/* ===== EN_ATTENTE ===== */}
            {occupation.statut === "EN_ATTENTE" && (
              <>
                <button
                  className="occupations-btn-primary"
                  disabled={loadingAction}
                  onClick={handleApprouver}
                >
                  {loadingAction ? "…" : "✓ Approuver"}
                </button>
                <button
                  className="occupations-btn-danger"
                  disabled={loadingAction}
                  onClick={handleRejeter}
                >
                  ✕ Rejeter
                </button>
              </>
            )}

            {/* ===== APPROUVE ===== */}
            {occupation.statut === "APPROUVE" && (
              <button
                className="occupations-btn-primary"
                disabled={loadingAction}
                onClick={handlePasserEnCours}
              >
                {loadingAction ? "…" : "→ Passer en cours"}
              </button>
            )}

            {/* ===== EN_COURS → Demander libération ===== */}
            {occupation.statut === "EN_COURS" && (
              <button
                className="occupations-btn-primary"
                disabled={loadingAction}
                onClick={() => setShowLiberation("demander")}
              >
                Demander la libération
              </button>
            )}

            {/* ===== DEMANDE_LIBERATION → Valider / Refuser ===== */}
            {occupation.statut === "DEMANDE_LIBERATION" && (
              <>
                <button
                  className="occupations-btn-primary"
                  disabled={loadingAction}
                  onClick={() => setShowLiberation("valider")}
                >
                  Valider la libération
                </button>
                <button
                  className="occupations-btn-danger"
                  disabled={loadingAction}
                  onClick={handleRefuserLiberation}
                >
                  Refuser
                </button>
              </>
            )}

            {/* ===== État des lieux ===== */}
            {canGenerateEdl && (
              <button
                className="occupations-btn-pdf"
                disabled={loadingAction}
                onClick={() => setShowEdl(true)}
                title="Générer l'état des lieux PDF"
              >
                📄 État des lieux
              </button>
            )}

            {/* ===== Actions communes ===== */}
            <button
              className="occupations-btn-secondary"
              onClick={() => onEdit(occupation)}
              disabled={loadingAction}
            >
              ✎ Modifier
            </button>
            <button
              className="occupations-btn-danger"
              onClick={() => onDelete(occupation)}
              disabled={loadingAction}
            >
              🗑 Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* Modal État des lieux */}
      {showEdl && (
        <EtatDesLieuxForm
          occupation={occupation}
          onClose={() => setShowEdl(false)}
          onSuccess={onRefresh}
        />
      )}

      {/* Modal Libération */}
      {showLiberation && (
        <LiberationForm
          occupation={occupation}
          mode={showLiberation}
          onClose={() => setShowLiberation(null)}
          onSuccess={() => {
            onRefresh?.();
            onClose();
          }}
        />
      )}
    </div>
  );
}