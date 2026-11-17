"use client";

import React, { useState } from "react";
import type { Bail } from "../types";
import { formatDate, formatMoney } from "../constants";
import { StatutBadge } from "./StatutBadge";
import { InfoRow } from "./InfoRow";
import { bauxApi } from "../api";
import { useFeedback } from "../../shared/feedback";

type BailDetailModalProps = {
  bail: Bail;
  onClose: () => void;
  onEdit: (b: Bail) => void;
  onDelete: (b: Bail) => void;
  onRefresh?: () => void | Promise<void>;
};

const STATUTS_EN_ATTENTE_CHEF = [
  "EN_ATTENTE_MEF",
  "VISA_CF_SOUMIS",
  "VISA_CF_VALIDE",
] as const;

export function BailDetailModal({
  bail,
  onClose,
  onEdit,
  onDelete,
  onRefresh,
}: BailDetailModalProps) {
  const { confirmAction } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canValidateChef =
    !bail.approbationSrb &&
    (STATUTS_EN_ATTENTE_CHEF as readonly string[]).includes(bail.statut);

  const canDownloadContrat =
    bail.approbationSrb || bail.statut === "EN_COURS";

  const handleApprouverSrb = async () => {
    if (!(await confirmAction({
      title: "Valider le contrat de bail",
      message: `Le bail ${bail.numeroBail} passera en cours et la demande liée sera marquée comme validée. Le contrat pourra ensuite être téléchargé.`,
      confirmLabel: "Valider le bail",
      type: "info",
    }))) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await bauxApi.approuverSrb(bail.numeroBail);
      if (onRefresh) await onRefresh();
      onClose();
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Erreur lors de la validation"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadContrat = async () => {
    setBusy(true);
    setError(null);
    try {
      const url = await bauxApi.downloadContratPdf(bail.numeroBail);
      window.open(url, "_blank");
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Erreur lors de la génération du contrat PDF"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="baux-modal-overlay" onClick={onClose}>
      <div className="baux-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="baux-detail-header">
          <div>
            <h2>{bail.numeroBail}</h2>
            <p>
              {bail.bienNom || bail.bienNumero}
              {bail.locataireNom ? ` · ${bail.locataireNom}` : ""}
            </p>
          </div>
          <button type="button" className="baux-detail-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="baux-detail-body">
          {error && (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                background: "#fee2e2",
                color: "#b91c1c",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div className="baux-detail-section">
            <div className="baux-detail-section-title">
              Informations générales
            </div>
            <div className="baux-detail-infos">
              <div className="baux-info-row">
                <span className="baux-info-label">Statut</span>
                <StatutBadge statut={bail.statut} />
              </div>
              <InfoRow label="N° Bien" value={bail.bienNumero} />
              {bail.bienNom && <InfoRow label="Bien" value={bail.bienNom} />}
              {bail.locataireNom && (
                <InfoRow label="Locataire" value={bail.locataireNom} />
              )}
              <InfoRow label="Date début" value={formatDate(bail.dateDebut)} />
              <InfoRow label="Date fin" value={formatDate(bail.dateFin)} />
              <InfoRow
                label="Montant loyer"
                value={formatMoney(bail.montantLoyer)}
              />
              {bail.demandeReference && (
                <InfoRow label="Réf. demande" value={bail.demandeReference} />
              )}
            </div>
          </div>

          {(bail.nomBailleur || bail.nifBailleur || bail.ribBailleur) && (
            <div className="baux-detail-section">
              <div className="baux-detail-section-title">Bailleur</div>
              <div className="baux-detail-infos">
                {bail.nomBailleur && (
                  <InfoRow label="Nom" value={bail.nomBailleur} />
                )}
                {bail.nifBailleur && (
                  <InfoRow label="NIF" value={bail.nifBailleur} />
                )}
                {bail.statBailleur && (
                  <InfoRow label="STAT" value={bail.statBailleur} />
                )}
                {bail.ribBailleur && (
                  <InfoRow label="RIB" value={bail.ribBailleur} />
                )}
              </div>
            </div>
          )}

          {canValidateChef && (
            <div className="baux-detail-section">
              <div className="baux-detail-section-title">
                Validation Chef SRB
              </div>
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 13,
                  color: "#64748b",
                }}
              >
                La validation finalise le bail (EN_COURS) et la demande liée
                (VALIDÉE). Le contrat PDF devient ensuite téléchargeable.
              </p>
              <button
                type="button"
                className="baux-btn-primary"
                disabled={busy}
                onClick={handleApprouverSrb}
              >
                {busy ? "Validation…" : "Valider le bail (Chef SRB)"}
              </button>
            </div>
          )}

          {canDownloadContrat && (
            <div className="baux-detail-section">
              <div className="baux-detail-section-title">Contrat de bail</div>
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 13,
                  color: "#64748b",
                }}
              >
                Génération à partir des données du bail, du bien, du locataire
                et du bailleur.
              </p>
              <button
                type="button"
                className="baux-btn-primary"
                disabled={busy}
                onClick={handleDownloadContrat}
              >
                {busy ? "Génération…" : "📄 Télécharger le contrat PDF"}
              </button>
            </div>
          )}

          <div className="baux-detail-actions">
            <button
              type="button"
              className="baux-btn-secondary"
              onClick={() => onEdit(bail)}
              disabled={busy}
            >
              ✎ Modifier
            </button>
            <button
              type="button"
              className="baux-btn-danger"
              onClick={() => onDelete(bail)}
              disabled={busy}
            >
              🗑 Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}