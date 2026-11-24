"use client";

import React, { useMemo, useEffect, useState } from "react";
import { Demande, StatutDemande, TypeDemande } from "../types/demande";

interface RecommendationIA {
  reference: string;
  typeDemande: string;
  score: number;
  avis: "FAVORABLE" | "RESERVE" | "DEFAVORABLE";
  recommandation: string;
  pointsPositifs: string[];
  alertes: string[];
  demandeur: string;
}

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

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
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatMoney(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("fr-MG", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(Number(n)) + " Ar";
}

/** Sépare texte libre et JSON métier */
function parseDescription(raw?: string | null): {
  text: string;
  metier: Record<string, any> | null;
} {
  if (!raw?.trim()) return { text: "", metier: null };
  const marker = "[DONNEES_METIER]";
  const idx = raw.indexOf(marker);
  if (idx === -1) return { text: raw.trim(), metier: null };
  const text = raw.slice(0, idx).trim();
  try {
    const metier = JSON.parse(raw.slice(idx + marker.length));
    return { text, metier };
  } catch {
    return { text: raw.trim(), metier: null };
  }
}

interface Props {
  demande: Demande;
  onClose: () => void;
  onEdit: (d: Demande) => void;
  onDelete: (d: Demande) => void;
  canValidate: boolean;
  isValidating: boolean;
  onValidate: (d: Demande) => void;
  onReject?: (d: Demande) => void;
}

export default function DemandeDetailModal({
  demande,
  onClose,
  onEdit,
  onDelete,
  canValidate,
  isValidating,
  onValidate,
  onReject,
}: Props) {
  const st = statutConfig[demande.statut];
  const { text, metier } = useMemo(
    () => parseDescription(demande.description),
    [demande.description]
  );

  const [iaData, setIaData] = useState<RecommendationIA | null>(null);
  const [loadingIa, setLoadingIa] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchRecommendation() {
      if (!demande.reference) return;
      try {
        setLoadingIa(true);
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        const res = await fetch(`${API_URL}/dashboard/ia/recommandation/${encodeURIComponent(demande.reference)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setIaData(data);
        }
      } catch (err) {
        console.error("Erreur récupération recommandation IA :", err);
      } finally {
        if (isMounted) setLoadingIa(false);
      }
    }
    fetchRecommendation();
    return () => {
      isMounted = false;
    };
  }, [demande.reference]);

  return (
    <div className="demandes-modal-overlay" onClick={onClose}>
      <div
        className="demandes-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="demandes-detail-header">
          <div>
            <h2>{demande.reference}</h2>
            <p>
              {typeLabel[demande.typeDemande]}
              {demande.demandeur
                ? ` · ${demande.demandeur.prenom} ${demande.demandeur.nom}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            className="demandes-detail-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="demandes-detail-body">
          {/* ── BANDEAU RECOMMANDATION IA DÉCISIONNELLE ── */}
          {loadingIa && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: 12,
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>🤖</span> Analyse décisionnelle en temps réel par l&apos;IA en cours...
            </div>
          )}

          {iaData && !loadingIa && (
            <div
              style={{
                marginBottom: 18,
                padding: "14px 16px",
                borderRadius: 12,
                background:
                  iaData.avis === "FAVORABLE"
                    ? "#f0fdf4"
                    : iaData.avis === "DEFAVORABLE"
                    ? "#fef2f2"
                    : "#fffbeb",
                border: `1px solid ${
                  iaData.avis === "FAVORABLE"
                    ? "#bbf7d0"
                    : iaData.avis === "DEFAVORABLE"
                    ? "#fecaca"
                    : "#fde68a"
                }`,
                boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🤖</span>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 800,
                      color:
                        iaData.avis === "FAVORABLE"
                          ? "#15803d"
                          : iaData.avis === "DEFAVORABLE"
                          ? "#b91c1c"
                          : "#b45309",
                      letterSpacing: ".2px",
                      textTransform: "uppercase",
                    }}
                  >
                    Avis Décisionnel IA : Recommandation {iaData.avis}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 12,
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                  }}
                >
                  Indice de conformité : {iaData.score}%
                </span>
              </div>

              <p style={{ fontSize: 12.5, fontWeight: 600, color: "#1e293b", margin: "4px 0 8px" }}>
                {iaData.recommandation}
              </p>

              {iaData.pointsPositifs && iaData.pointsPositifs.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 4 }}>
                  {iaData.pointsPositifs.map((pt, idx) => (
                    <div key={idx} style={{ fontSize: 11, color: "#166534", display: "flex", alignItems: "center", gap: 4 }}>
                      <span>✓</span> {pt}
                    </div>
                  ))}
                </div>
              )}

              {iaData.alertes && iaData.alertes.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                  {iaData.alertes.map((alt, idx) => (
                    <div key={idx} style={{ fontSize: 11, color: "#991b1b", display: "flex", alignItems: "center", gap: 4 }}>
                      <span>⚠️</span> {alt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="demandes-detail-infos">
            <div className="demandes-info-row">
              <span className="demandes-info-label">Statut</span>
              <span
                className="demandes-badge"
                style={{ background: st.bg, color: st.color }}
              >
                {st.label}
              </span>
            </div>

            <InfoRow label="Type" value={typeLabel[demande.typeDemande]} />

            {demande.demandeur && (
              <InfoRow
                label="Demandeur"
                value={`${demande.demandeur.prenom} ${demande.demandeur.nom}${
                  demande.demandeur.matricule
                    ? ` · ${demande.demandeur.matricule}`
                    : ""
                }`}
              />
            )}

            {demande.bien && (
              <>
                <InfoRow label="N° Bien" value={demande.bien.numeroBien} />
                <InfoRow label="Bien" value={demande.bien.nomDuBien} />
              </>
            )}

            {demande.motif && <InfoRow label="Motif" value={demande.motif} />}

            <InfoRow
              label="Date de création"
              value={formatDate(demande.createdAt)}
            />
            <InfoRow
              label="Date de validation"
              value={formatDate(demande.dateValidation)}
            />

            {/* Texte libre uniquement */}
            {text && (
              <div className="demandes-detail-block">
                <div className="demandes-detail-block-title">Description</div>
                <p className="demandes-detail-desc">{text}</p>
              </div>
            )}

            {/* Données métier structurées */}
            {metier?.occupation && (
              <MetierSection title="Détails occupation">
                <InfoRow
                  label="Statut occupation"
                  value={String(metier.occupation.statut || "—")}
                />
                <InfoRow
                  label="Date d'entrée"
                  value={formatDate(metier.occupation.dateEntree)}
                />
                <InfoRow
                  label="Délai de jouissance"
                  value={
                    metier.occupation.delaiJouissanceMois
                      ? `${metier.occupation.delaiJouissanceMois} mois`
                      : "—"
                  }
                />
                <InfoRow
                  label="Sortie prévue"
                  value={formatDate(metier.occupation.dateSortiePrevue)}
                />
                <InfoRow
                  label="Sortie réelle"
                  value={formatDate(metier.occupation.dateSortieReelle)}
                />
              </MetierSection>
            )}

            {metier?.liberation && (
              <MetierSection title="Détails libération">
                <InfoRow
                  label="Motif de libération"
                  value={metier.liberation.motifLiberation || "—"}
                />
                <InfoRow
                  label="Date de sortie"
                  value={formatDate(
                    metier.liberation.dateSortieReelle ||
                      metier.liberation.dateSortieSouhaitee
                  )}
                />
                <InfoRow
                  label="Clés restituées"
                  value={metier.liberation.clesRestituees ? "Oui" : "Non"}
                />
                <InfoRow
                  label="Procédure judiciaire"
                  value={
                    metier.liberation.procedureJudiciaire ? "Oui" : "Non"
                  }
                />
              </MetierSection>
            )}

            {metier?.bail && (
              <MetierSection title="Détails contrat de bail">
                <InfoRow
                  label="Date de début"
                  value={formatDate(metier.bail.dateDebut)}
                />
                <InfoRow
                  label="Date de fin"
                  value={formatDate(metier.bail.dateFin)}
                />
                <InfoRow
                  label="Montant du loyer"
                  value={formatMoney(metier.bail.montantLoyer)}
                />
                {metier.bail.nomBailleur && (
                  <InfoRow label="Bailleur" value={metier.bail.nomBailleur} />
                )}
                {metier.bail.nifBailleur && (
                  <InfoRow label="NIF bailleur" value={metier.bail.nifBailleur} />
                )}
                {metier.bail.statBailleur && (
                  <InfoRow
                    label="STAT bailleur"
                    value={metier.bail.statBailleur}
                  />
                )}
                {metier.bail.ribBailleur && (
                  <InfoRow label="RIB bailleur" value={metier.bail.ribBailleur} />
                )}
              </MetierSection>
            )}

            {metier?.attestation && (
              <MetierSection title="Attestation">
                <InfoRow
                  label="Type"
                  value={String(
                    metier.attestation.typeAttestation || "NON_LOGEMENT"
                  )}
                />
              </MetierSection>
            )}

            {metier?.quitus && (
              <MetierSection title="Recensement / Quitus">
                <InfoRow
                  label="Année"
                  value={String(metier.quitus.annee || "—")}
                />
                <InfoRow
                  label="État du bâtiment"
                  value={String(metier.quitus.etatBatiment || "—")}
                />
                {metier.quitus.observations && (
                  <InfoRow
                    label="Observations"
                    value={metier.quitus.observations}
                  />
                )}
              </MetierSection>
            )}

            {metier?.travaux && (
              <MetierSection title="Travaux">
                <InfoRow
                  label="Type"
                  value={String(metier.travaux.typeTravaux || "—")}
                />
                <InfoRow
                  label="Montant estimatif"
                  value={formatMoney(metier.travaux.montantEstimatif)}
                />
                <InfoRow
                  label="Début prévu"
                  value={formatDate(metier.travaux.dateDebutPrevue)}
                />
                <InfoRow
                  label="Fin prévue"
                  value={formatDate(metier.travaux.dateFinPrevue)}
                />
              </MetierSection>
            )}

            {demande.validations && demande.validations.length > 0 && (
              <div className="demandes-detail-block">
                <div className="demandes-detail-block-title">Validations</div>
                <ul className="demandes-validations-list">
                  {demande.validations.map((v) => (
                    <li key={v.refValidation}>
                      Niveau {v.niveau} — {v.statut}
                      {v.commentaire ? ` : ${v.commentaire}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="demandes-detail-actions">
            {canValidate &&
              (demande.statut === "EN_ATTENTE" ||
                demande.statut === "EN_COURS") && (
                <>
                  <button
                    type="button"
                    className="demandes-btn-validate"
                    onClick={() => onValidate(demande)}
                    disabled={isValidating}
                  >
                    {isValidating ? "Validation..." : "✓ Valider"}
                  </button>
                  {onReject && (
                    <button
                      type="button"
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "1px solid #fecaca",
                        background: "#fee2e2",
                        color: "#dc2626",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                      onClick={() => onReject(demande)}
                      disabled={isValidating}
                    >
                      ✕ Refuser
                    </button>
                  )}
                </>
              )}
            <button
              type="button"
              className="demandes-btn-secondary"
              onClick={() => onEdit(demande)}
            >
              ✎ Modifier
            </button>
            <button
              type="button"
              className="demandes-btn-danger"
              onClick={() => onDelete(demande)}
            >
              🗑 Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="demandes-info-row">
      <span className="demandes-info-label">{label}</span>
      <span className="demandes-info-value">{value || "—"}</span>
    </div>
  );
}

function MetierSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="demandes-detail-block">
      <div className="demandes-detail-block-title">{title}</div>
      <div className="demandes-detail-metier">{children}</div>
    </div>
  );
}