"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./IAPage.css";

import ChatBubble from "../ia/Chatbubble";
import {
  iaApi,
  ApiError,
  type Analyse,
  type Indicateurs,
} from "../ia/iaapi";
import {
  buildAlertes,
  buildRecommandations,
  type Priorite,
} from "../ia/iautils";

/* ── Helpers d'affichage ── */
const prioClass = (p: Priorite) =>
  p === "HAUTE" ? "ia-prio-haute" : p === "MOYENNE" ? "ia-prio-moyenne" : "ia-prio-basse";

const prioLabel = (p: Priorite) =>
  p === "HAUTE" ? "Priorité haute" : p === "MOYENNE" ? "Priorité moyenne" : "Priorité basse";

const messageErreur = (e: unknown) =>
  e instanceof Error ? e.message : "Erreur inconnue";

// Couleur du badge de niveau de risque
function couleurRisque(niveau: string): { background: string; color: string } {
  const n = niveau.toUpperCase();
  if (n === "FAIBLE") return { background: "#dcfce7", color: "#15803d" };
  if (n === "MOYEN") return { background: "#fef3c7", color: "#92400e" };
  return { background: "#fee2e2", color: "#b91c1c" }; // ELEVÉ, CRITIQUE
}

const MAX_DETAILS = 8;
const MAX_ALERTES = 6;
const MAX_ANOMALIES = 6;

/* ── Page ── */
const MODULE_PAR_RECOMMANDATION: Record<string, string> = {
  doublons: "occupations",
  "sans-titre": "liberations",
  "sans-quitus-n1": "travaux",
  "retards-travaux": "travaux",
  "delais-occupation": "occupations",
  "chantiers-multiples": "travaux",
  "sans-quitus-annee": "recensement",
};

export default function IADecisionPage({
  onNavigate,
}: {
  onNavigate?: (moduleKey: string) => void;
}) {
  const [indicateurs, setIndicateurs] = useState<Indicateurs | null>(null);
  const [analyse, setAnalyse] = useState<Analyse | null>(null);
  const [analyseNote, setAnalyseNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [majLe, setMajLe] = useState<Date | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const charger = useCallback(async (silencieux = false) => {
    if (silencieux) setRefreshing(true);
    else setLoading(true);
    setError("");

    const [ind, ana] = await Promise.allSettled([
      iaApi.getIndicateurs(),
      iaApi.getAnalyse(),
    ]);

    if (ind.status === "fulfilled") {
      setIndicateurs(ind.value);
    } else {
      setIndicateurs(null);
    }

    if (ana.status === "fulfilled") {
      setAnalyse(ana.value);
      setAnalyseNote(
        ind.status === "rejected"
          ? `Les indicateurs synthétiques n'ont pas pu être chargés : ${messageErreur(ind.reason)}`
          : ""
      );
    } else {
      setAnalyse(null);
      setAnalyseNote(
        ana.reason instanceof ApiError && ana.reason.status === 403
          ? "Le détail des recommandations et des anomalies est réservé au Chef SRB et à l'Administrateur."
          : `Le rapport détaillé n'a pas pu être chargé : ${messageErreur(ana.reason)}`
      );
    }

    if (ind.status === "rejected" && ana.status === "rejected") {
      setError(
        `Les indicateurs et le rapport détaillé sont indisponibles. Indicateurs : ${messageErreur(ind.reason)}. Analyse : ${messageErreur(ana.reason)}`
      );
    }

    setMajLe(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const recos = useMemo(() => (analyse ? buildRecommandations(analyse) : []), [analyse]);
  const alertes = useMemo(() => (analyse ? buildAlertes(analyse) : []), [analyse]);

  // Anomalies critiques détectées par le backend
  const anomaliesCritiques = useMemo(() => {
    if (!analyse) return [];
    const a = analyse.anomalies;
    return [
      ...a.doublonsAvantageLogement,
      ...a.occupantsSansTitre,
      ...a.travauxSansQuitus,
      ...a.retardsTravaux,
      ...a.biensSurcharges,
    ]
      .filter((x) => x.gravite === "CRITIQUE")
      .map((x) => x.message);
  }, [analyse]);

  const selectedReco = recos.find((r) => r.id === selectedId) ?? recos[0] ?? null;
  const moduleCible = selectedReco
    ? MODULE_PAR_RECOMMANDATION[selectedReco.id]
    : undefined;

  const tauxOccupation =
    indicateurs && indicateurs.biens.total > 0
      ? Math.round((indicateurs.biens.occupes / indicateurs.biens.total) * 100)
      : 0;
  const analyseRestreinte = analyseNote.includes("réservé");

  /* ── États de chargement / erreur ── */
  if (loading) {
    return (
      <div className="ia-page">
        <div
          style={{
            minHeight: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted, #64748b)",
            fontSize: 14,
          }}
        >
          Chargement des analyses…
        </div>
        <ChatBubble />
      </div>
    );
  }

  if (error) {
    return (
      <div className="ia-page">
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: 20,
            color: "#b91c1c",
          }}
        >
          <strong>Erreur de chargement de l&apos;analyse IA</strong>
          <p style={{ marginTop: 8, fontSize: 13 }}>{error}</p>
          <button
            onClick={() => charger()}
            style={{
              marginTop: 12,
              padding: "8px 14px",
              borderRadius: 7,
              border: "none",
              background: "#b91c1c",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Réessayer
          </button>
        </div>
        <ChatBubble />
      </div>
    );
  }

  return (
    <div className="ia-page">
      {/* Header */}
      <div className="ia-header">
        <div>
          <h2>IA — Aide à la décision</h2>
          <p>
            Recommandations, alertes et analyse pour piloter les biens, occupations et travaux
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {indicateurs && (
            <span
              className="ia-badge"
              style={{ ...couleurRisque(indicateurs.niveauRisque), fontWeight: 700 }}
            >
              Risque : {indicateurs.niveauRisque}
            </span>
          )}

          <div className="ia-header-badge">
            Données en direct
            {majLe &&
              ` · ${majLe.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
          </div>

          <button
            className="ia-btn-secondary"
            onClick={() => charger(true)}
            disabled={refreshing}
          >
            {refreshing ? "Actualisation…" : "Actualiser"}
          </button>
        </div>
      </div>

      {/* Note de restriction ou d'erreur sur le rapport détaillé */}
      {analyseNote && (
        <div
          style={{
            background: analyseRestreinte ? "var(--blue-bg, #eff6ff)" : "#fef2f2",
            border: `1px solid ${analyseRestreinte ? "#bfdbfe" : "#fecaca"}`,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            color: analyseRestreinte ? "#1e40af" : "#b91c1c",
            marginBottom: 16,
          }}
        >
          {analyseNote}
        </div>
      )}

      {/* Anomalies critiques */}
      {anomaliesCritiques.length > 0 && (
        <div className="ia-anomalies">
          <h3>Anomalies critiques détectées ({anomaliesCritiques.length})</h3>
          <ul>
            {anomaliesCritiques.slice(0, MAX_ANOMALIES).map((message, i) => (
              <li key={i}>{message}</li>
            ))}
            {anomaliesCritiques.length > MAX_ANOMALIES && (
              <li>… et {anomaliesCritiques.length - MAX_ANOMALIES} autre(s).</li>
            )}
          </ul>
        </div>
      )}

      {/* KPI */}
      {indicateurs && (
        <div className="ia-kpis">
          <div className="ia-kpi">
            <div className="ia-kpi-label">Chantiers en retard</div>
            <div
              className="ia-kpi-value"
              style={indicateurs.travauxEnRetard > 0 ? { color: "var(--red)" } : undefined}
            >
              {indicateurs.travauxEnRetard}
            </div>
            <div className="ia-kpi-hint">
              {indicateurs.travauxSansQuitus} sans quitus N-1
            </div>
          </div>

          <div className="ia-kpi">
            <div className="ia-kpi-label">Occupations sans titre</div>
            <div
              className="ia-kpi-value"
              style={indicateurs.occupantsSansTitre > 0 ? { color: "var(--red)" } : undefined}
            >
              {indicateurs.occupantsSansTitre}
            </div>
            <div className="ia-kpi-hint">Régularisation à engager</div>
          </div>

          <div className="ia-kpi">
            <div className="ia-kpi-label">Fins d&apos;occupation</div>
            <div className="ia-kpi-value">{indicateurs.occupationsFin30j}</div>
            <div className="ia-kpi-hint">Dans les 30 prochains jours</div>
          </div>

          <div className="ia-kpi">
            <div className="ia-kpi-label">Taux d&apos;occupation</div>
            <div className="ia-kpi-value" style={{ color: "var(--gold-dark)" }}>
              {tauxOccupation} %
            </div>
            <div className="ia-kpi-hint">
              {indicateurs.biens.occupes} occupés · {indicateurs.biens.libres} libres ·{" "}
              {indicateurs.biens.total} biens
            </div>
          </div>
        </div>
      )}

      <div className="ia-grid">
        {/* Colonne gauche : recommandations */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ia-card">
            <div className="ia-card-header">
              <h3>Recommandations IA</h3>
              {analyse && (
                <span className="ia-badge ia-prio-haute">
                  {recos.length} active{recos.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="ia-card-body">
              {!analyse ? (
                <p style={{ fontSize: 13, color: "var(--muted, #64748b)" }}>
                  Recommandations indisponibles pour le moment.
                </p>
              ) : recos.length === 0 ? (
                <p style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                  ✅ Aucune anomalie détectée : la situation est conforme.
                </p>
              ) : (
                recos.map((r) => (
                  <div
                    key={r.id}
                    className="ia-reco"
                    onClick={() => setSelectedId(r.id)}
                    style={
                      selectedReco?.id === r.id
                        ? { borderColor: "var(--gold)", background: "var(--gold-bg)" }
                        : undefined
                    }
                  >
                    <div className="ia-reco-top">
                      <div className="ia-reco-title">{r.titre}</div>
                      <span className="ia-score">
                        {r.nombre} cas
                      </span>
                    </div>
                    <div className="ia-reco-desc">{r.description}</div>
                    <div className="ia-reco-meta">
                      <span className={`ia-badge ${prioClass(r.priorite)}`}>
                        {prioLabel(r.priorite)}
                      </span>
                      <span className="ia-tag">{r.domaine}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite : détail + alertes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {selectedReco && (
            <div className="ia-card">
              <div className="ia-card-header">
                <h3>Détail de la recommandation</h3>
                <span className={`ia-badge ${prioClass(selectedReco.priorite)}`}>
                  {prioLabel(selectedReco.priorite)}
                </span>
              </div>

              <div className="ia-card-body">
                <div className="ia-reco-title" style={{ marginBottom: 8 }}>
                  {selectedReco.titre}
                </div>
                <div className="ia-reco-desc">{selectedReco.description}</div>

                <div
                  style={{
                    background: "var(--gold-bg)",
                    border: "1px solid var(--gold-light)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--gold-dark)",
                    marginTop: 8,
                  }}
                >
                  → {selectedReco.actionSuggeree}
                </div>
                {onNavigate && moduleCible && (
                  <button
                    type="button"
                    className="ia-btn-secondary"
                    onClick={() => onNavigate(moduleCible)}
                    style={{ marginTop: 10 }}
                  >
                    Ouvrir le module concerné
                  </button>
                )}

                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text, #1e293b)",
                    margin: "14px 0 6px",
                  }}
                >
                  Éléments concernés ({selectedReco.details.length})
                </div>

                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    fontSize: 12,
                    lineHeight: 1.7,
                    color: "var(--muted, #64748b)",
                  }}
                >
                  {selectedReco.details.slice(0, MAX_DETAILS).map((d: string, i) => (
                    <li key={i}>{d}</li>
                  ))}
                  {selectedReco.details.length > MAX_DETAILS && (
                    <li>… et {selectedReco.details.length - MAX_DETAILS} autre(s).</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <div className="ia-card">
            <div className="ia-card-header">
              <h3>Alertes &amp; signaux faibles</h3>
            </div>

            <div className="ia-card-body">
              {!analyse ? (
                <p style={{ fontSize: 13, color: "var(--muted, #64748b)" }}>
                  Alertes indisponibles pour le moment.
                </p>
              ) : alertes.length === 0 ? (
                <p style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                  ✅ Aucune alerte active.
                </p>
              ) : (
                <>
                  {alertes.slice(0, MAX_ALERTES).map((a) => (
                    <div key={a.id} className="ia-alert">
                      <div
                        className="ia-alert-icon"
                        style={{
                          background:
                            a.niveau === "critique"
                              ? "var(--red-bg)"
                              : a.niveau === "attention"
                                ? "var(--orange-bg)"
                                : "var(--blue-bg)",
                        }}
                      >
                        {a.icon}
                      </div>
                      <div>
                        <div className="ia-alert-title">{a.titre}</div>
                        <div className="ia-alert-desc">{a.description}</div>
                      </div>
                    </div>
                  ))}

                  {alertes.length > MAX_ALERTES && (
                    <p style={{ fontSize: 12, color: "var(--muted, #64748b)", marginTop: 8 }}>
                      … et {alertes.length - MAX_ALERTES} autre(s) alerte(s).
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat IA : bulle flottante à droite de l'application */}
      <ChatBubble />
    </div>
  );
}