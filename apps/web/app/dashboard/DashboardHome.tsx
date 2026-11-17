"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

import { C } from "./shared/constants";
import {
  dashboardApi,
  type DashboardStats,
  type GeneralStats,
  type DemandeRecent,
  type AgentDashboard as AgentDashboardType,
} from "./dashboard-api";
import { getStoredUser } from "../lib/auth";

/* ------------------------------------------------------------------ */
/*  Données unifiées                                                    */
/* ------------------------------------------------------------------ */
type UnifiedStats = {
  totalDemandes: number;
  demandesValidees: number;
  demandesEnCours: number;
  demandesEnAttente: number;
  totalBiens: number;
  totalUsers: number;
  totalBauxActifs: number;
  totalOccupations: number;
  bauxExpirantBientot: number;
  travauxEnCours: number;
  totalBaux: number | null;
  recentDemandes: DemandeRecent[];
  dossiersAValider?: DemandeRecent[];
};

const n = (v: unknown): number =>
  typeof v === "number" && !isNaN(v) ? v : 0;

function normalizeStats(
  stats: DashboardStats,
  general: GeneralStats | null
): UnifiedStats {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = stats as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (general ?? {}) as any;
  const global = s.global ?? {};

  const totalDemandes = n(
    global.totalDemandes ?? g.totalDemandes ?? s.mesDemandes ??
      n(s.demandesEnAttente) + n(s.mesValidations)
  );
  const demandesValidees = n(
    global.demandesValidees ?? g.demandesValidees ?? s.mesValidations
  );
  const demandesEnCours = n(
    global.demandesEnCours ?? g.demandesEnCours ?? s.demandesEnCours ?? 0
  );
  const demandesEnAttente = n(
    global.demandesEnAttente ?? s.demandesEnAttente ?? Math.max(0, totalDemandes - demandesValidees - demandesEnCours)
  );

  return {
    totalDemandes,
    demandesValidees,
    demandesEnCours,
    demandesEnAttente,
    totalBiens: n(global.totalBiens ?? g.totalBiens),
    totalUsers: n(global.totalUsers ?? g.totalUsers),
    totalBauxActifs: n(global.totalBauxActifs ?? g.totalBauxActifs ?? s.bauxActifs),
    totalOccupations: n(
      global.totalOccupations ?? g.totalOccupations ?? s.occupations?.length
    ),
    bauxExpirantBientot: n(global.bauxExpirantBientot ?? s.bauxExpirantBientot ?? 0),
    travauxEnCours: n(global.travauxEnCours ?? s.travauxEnCours ?? 0),
    totalBaux: typeof g.totalBaux === "number" ? g.totalBaux : null,
    recentDemandes:
      s.recentDemandes ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s.validationsRecentes ?? []).map((v: any) => v.demande).filter(Boolean) ??
      [],
    dossiersAValider: s.dossiersAValider ?? [],
  };
}

const BiensMap = dynamic(() => import("../dashboard/BienMap"), {
  ssr: false,
  loading: () => (
    <p style={{ color: C.muted, fontSize: 12 }}>Chargement de la carte...</p>
  ),
});

/* ================================================================== */
/*  COMPOSANTS D'ASPECT DU NOUVEAU DASHBOARD                            */
/* ================================================================== */

/** Carte statistique supérieure propre (ex: 24 Check Ins, 22 Check Outs, 1456 Total Properties) */
function ModernStatCard({
  value,
  label,
  icon,
  iconBg,
  iconColor,
}: {
  value: number | string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 18,
        border: `1px solid ${C.border}`,
        padding: "22px 24px",
        boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flex: 1,
        minWidth: 0,
        transition: "transform .2s ease, box-shadow .2s ease",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: C.text,
            lineHeight: 1.1,
            letterSpacing: "-.5px",
          }}
        >
          {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: C.muted,
            fontWeight: 500,
            marginTop: 6,
          }}
        >
          {label}
        </div>
      </div>

      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: "50%",
          background: iconBg,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
    </div>
  );
}

/** Jauge d'occupation circulaire avec curseur point (Occupancy Percent) */
function CircularGauge({
  percentage,
  sublabel,
}: {
  percentage: number;
  sublabel: string;
}) {
  const safePct = Math.min(100, Math.max(0, percentage));
  const stroke = 8;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safePct / 100) * circumference;

  // Calcul coordonnées du point d'arrivée
  const angle = (safePct / 100) * 360 - 90;
  const angleRad = (angle * Math.PI) / 180;
  const cx = 70 + radius * Math.cos(angleRad);
  const cy = 70 + radius * Math.sin(angleRad);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* Cercle de fond */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={stroke}
          />
          {/* Cercle de progression */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={C.gold}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
          {/* Point curseur au bout */}
          <circle cx={cx} cy={cy} r="6" fill={C.goldDark} />
        </svg>

        {/* Valeur centrale */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 800,
            color: C.text,
          }}
        >
          {safePct}%
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 10,
          fontSize: 11.5,
          color: C.muted,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: C.gold,
            display: "inline-block",
          }}
        />
        <span>{sublabel}</span>
      </div>
    </div>
  );
}

/** Courbe SVG fluide avec point interactif (Property Releases chart) */
function SmoothCurveChart({
  points,
}: {
  points: { day: string; val: number }[];
}) {
  const width = 440;
  const height = 150;
  const paddingX = 24;
  const paddingY = 24;

  const maxVal = Math.max(...points.map((p) => p.val), 10);
  const minVal = 0;

  // Calcul des coordonnées x, y
  const coords = points.map((p, i) => {
    const x = paddingX + (i / Math.max(1, points.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((p.val - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
    return { x, y, day: p.day, val: p.val };
  });

  // Construction d'une courbe de Bézier cubique douce
  let d = coords[0] ? `M ${coords[0].x} ${coords[0].y}` : "";
  for (let i = 0; i < coords.length - 1; i++) {
    const current = coords[i];
    const next = coords[i + 1];
    if (current && next) {
      const cpX1 = current.x + (next.x - current.x) / 2;
      const cpY1 = current.y;
      const cpX2 = current.x + (next.x - current.x) / 2;
      const cpY2 = next.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }
  }

  // Point culminant / highlight
  const highlightIdx = Math.floor(coords.length / 2);
  const hl = coords[highlightIdx];

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        {/* Lignes horizontales en pointillés */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={paddingX}
            y1={height * ratio}
            x2={width - paddingX}
            y2={height * ratio}
            stroke="#f1f5f9"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        ))}

        {/* Courbe principale */}
        <path
          d={d}
          fill="none"
          stroke={C.blue}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Cercle et point highlight */}
        {hl && (
          <>
            <circle cx={hl.x} cy={hl.y} r="6" fill="#ffffff" stroke={C.blue} strokeWidth="3" />
            <circle cx={hl.x} cy={hl.y} r="3" fill={C.blue} />
          </>
        )}
      </svg>

      {/* Infobulle flottante au-dessus du point highlight */}
      {hl && (
        <div
          style={{
            position: "absolute",
            left: `${(hl.x / width) * 100}%`,
            top: `${(hl.y / height) * 100 - 32}%`,
            transform: "translateX(-50%)",
            background: C.blue,
            color: "#ffffff",
            fontSize: 10.5,
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: 6,
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
            whiteSpace: "nowrap",
          }}
        >
          {hl.val}
        </div>
      )}

      {/* Graduations sous l'axe X */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: `0 ${paddingX}px`,
          marginTop: -6,
        }}
      >
        {points.map((p) => (
          <span key={p.day} style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>
            {p.day}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  VUE DU DASHBOARD GENERAL (ADMIN & CHEF)                             */
/* ================================================================== */
function GeneralDashboardLayout({
  data,
  onNavigate,
}: {
  data: UnifiedStats;
  onNavigate?: (key: string) => void;
}) {
  const tauxOccupation =
    data.totalBiens > 0
      ? Math.round((data.totalOccupations / data.totalBiens) * 100)
      : 0;

  // Données de tendance pour la courbe supérieure
  const curvePoints = [
    { day: "16", val: 8 },
    { day: "18", val: 5 },
    { day: "20", val: 12 },
    { day: "24", val: 9 },
    { day: "26", val: Math.max(14, data.demandesValidees) },
    { day: "28", val: 10 },
    { day: "30", val: Math.max(16, data.totalDemandes) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── BARRE D'ACTIONS RAPIDES METIER ───────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#ffffff",
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: "10px 16px",
          boxShadow: "0 1px 4px rgba(15, 23, 42, 0.02)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".4px", marginRight: 4 }}>
          Actions rapides :
        </span>

        {onNavigate && (
          <>
            <button
              onClick={() => onNavigate("demandes")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                background: "#eff6ff",
                color: C.blue,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <span>+</span> Nouvelle Demande
            </button>

            <button
              onClick={() => onNavigate("biens")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                background: C.goldBg,
                color: C.goldDark,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <span>🔍</span> Consulter le Patrimoine
            </button>

            <button
              onClick={() => onNavigate("recensement")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                background: "#f0fdf4",
                color: C.green,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <span>📋</span> Campagne Recensement
            </button>

            <button
              onClick={() => onNavigate("bail")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                background: "#fffbeb",
                color: "#b45309",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <span>📑</span> Gestion des Baux
            </button>
          </>
        )}
      </div>

      {/* ── BANDEAU VIGILANCE : TRAVAUX EN COURS UNIQUEMENT (les alertes de baux et demandes sont gérées dans le module Notifications) ─── */}
      {data.travauxEnCours > 0 && (
        <div
          onClick={() => onNavigate && onNavigate("travaux")}
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 14,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: onNavigate ? "pointer" : "default",
            boxShadow: "0 1px 4px rgba(15, 23, 42, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>🛠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>
                {data.travauxEnCours} chantier(s) de travaux et maintenance en cours
              </div>
              <div style={{ fontSize: 11.5, color: "#16a34a" }}>
                Suivi opérationnel des chantiers et conformité Circulaire N°813
              </div>
            </div>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: "#15803d" }}>Accéder aux chantiers &rarr;</span>
        </div>
      )}

      {/* ── SECTION 1 : 3 GRANDES STAT CARDS HORIZONTALES ────────── */}
      <div className="eq-top-stats-grid">
        <ModernStatCard
          value={data.demandesValidees}
          label="Demandes Validées"
          iconBg="#eff6ff"
          iconColor={C.blue}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          }
        />

        <ModernStatCard
          value={data.demandesEnCours}
          label="Dossiers en Traitement"
          iconBg={C.goldBg}
          iconColor={C.goldDark}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />

        <ModernStatCard
          value={data.totalBiens}
          label="Total Patrimoine Régional"
          iconBg="#fef2f2"
          iconColor="#e11d48"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
        />
      </div>

      {/* ── SECTION 2 : COURBE FLUIDE (GAUCHE) + TAUX OCCUPATION (DROITE) ─ */}
      <div className="eq-mid-dual-grid">
        {/* Panneau gauche : Property Releases chart */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 18,
            border: `1px solid ${C.border}`,
            padding: "22px 24px",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
              Flux et Activité des Demandes
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>
              Évolution récente des attributions et libérations
            </div>
          </div>

          <div className="eq-curve-subgrid" style={{ margin: "14px 0" }}>
            <SmoothCurveChart points={curvePoints} />

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>Total Demandes</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 2 }}>
                  {data.totalDemandes.toLocaleString("fr-FR")}
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.green, marginTop: 3, display: "inline-block" }}>
                  +{data.demandesValidees} validées
                </span>
              </div>

              <div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>Baux Actifs</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 2 }}>
                  {data.totalBauxActifs.toLocaleString("fr-FR")}
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.blue, marginTop: 3, display: "inline-block" }}>
                  Actifs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Panneau droite : Occupancy Percent */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 18,
            border: `1px solid ${C.border}`,
            padding: "22px 24px",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 12 }}>
            Taux d&apos;Occupation
          </div>

          <CircularGauge
            percentage={tauxOccupation}
            sublabel={`${data.totalOccupations} biens occupés sur ${data.totalBiens}`}
          />
        </div>
      </div>

      {/* ── SECTION 3 : DEMANDES RECENTES ─ */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 18,
          border: `1px solid ${C.border}`,
          padding: "22px 24px",
          boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
            Demandes récentes
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
            Les 3 demandes les plus récentes
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.recentDemandes.length === 0 ? (
            <div style={{ padding: "20px 0", color: C.muted, fontSize: 12.5, textAlign: "center" }}>
              Aucune demande récente.
            </div>
          ) : (
            data.recentDemandes.slice(0, 3).map((demande, i) => (
              <div
                key={demande.id || demande.reference || i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: i % 2 === 0 ? "#fbfcfe" : "#ffffff",
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>
                    {demande.reference || `#${demande.id || i + 1}`}
                    {demande.demandeur && (
                      <span style={{ fontWeight: 500, color: C.muted, marginLeft: 8 }}>
                        {demande.demandeur.prenom} {demande.demandeur.nom}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {demande.typeDemande && <span>{demande.typeDemande}</span>}
                    {demande.createdAt && (
                      <span>
                        {demande.typeDemande ? " · " : ""}
                        Créée le {new Date(demande.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 16,
                    background: demande.statut === "VALIDEE" ? C.greenBg : demande.statut === "EN_COURS" ? "#fef3c7" : "#eff6ff",
                    color: demande.statut === "VALIDEE" ? C.green : demande.statut === "EN_COURS" ? "#92400e" : C.blue,
                    whiteSpace: "nowrap",
                  }}
                >
                  {demande.statut || "EN_ATTENTE"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── SECTION 4 : CARTE DU PATRIMOINE ────────────────────── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 18,
          border: `1px solid ${C.border}`,
          padding: "22px 24px",
          boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>
          Répartition Géographique des Biens
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 14 }}>
          Cartographie territoriale en Haute Matsiatra
        </div>
        <BiensMap />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  VUE DU DASHBOARD AGENT (Aspect Moderne avec Historique)           */
/* ================================================================== */
function AgentDashboardLayout({
  stats,
  onNavigate,
}: {
  stats: AgentDashboardType;
  onNavigate?: (key: string) => void;
}) {
  const [filterStatut, setFilterStatut] = useState<string>("ALL");

  const total = stats.mesDemandes || 0;
  const enCours = stats.demandesEnCours || 0;
  const validees = stats.demandesValidees || 0;
  const enAttente = stats.demandesEnAttente || 0;

  const tauxSucces = total > 0 ? Math.round((validees / total) * 100) : 0;

  const historique = stats.historiqueDemandes || stats.recentDemandes || [];
  const filteredHistorique = historique.filter((d) => {
    if (filterStatut === "ALL") return true;
    return d.statut === filterStatut;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── EN-TÊTE : TITRE + DATE ──────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-.5px", margin: 0 }}>
            Tableau de Bord &mdash; Espace Agent
          </h2>
        </div>

      </div>

      {/* ── ACTIONS RAPIDES AGENT ───────────────────────────────── */}
      {onNavigate && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#ffffff",
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "10px 16px",
            boxShadow: "0 1px 4px rgba(15, 23, 42, 0.02)",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".4px", marginRight: 4 }}>
            Actions rapides :
          </span>

          <button
            onClick={() => onNavigate("demandes")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              background: "#eff6ff",
              color: C.blue,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <span>+</span> Déposer une Demande
          </button>

          <button
            onClick={() => onNavigate("biens")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              background: C.goldBg,
              color: C.goldDark,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <span>🔍</span> Explorer les Logements
          </button>
        </div>
      )}

      {/* ── 3 CARTES STATISTIQUES SUPERIEURES ──────────────────── */}
      <div className="eq-top-stats-grid">
        <ModernStatCard
          value={validees}
          label="Demandes Approuvées"
          iconBg="#eff6ff"
          iconColor={C.blue}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
        />

        <ModernStatCard
          value={enCours}
          label="Dossiers en Instruction"
          iconBg={C.goldBg}
          iconColor={C.goldDark}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />

        <ModernStatCard
          value={total}
          label="Total de mes Demandes"
          iconBg="#fef2f2"
          iconColor="#e11d48"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          }
        />
      </div>

      {/* ── SECTION COURBE + TAUX DE VALIDATION ────────────────── */}
      <div className="eq-mid-dual-grid">
        <div
          style={{
            background: "#ffffff",
            borderRadius: 18,
            border: `1px solid ${C.border}`,
            padding: "22px 24px",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
            Dernières Demandes Soumises
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, marginBottom: 14 }}>
            Vos 3 demandes les plus récentes avec état d&apos;avancement
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(stats.recentDemandes || []).length === 0 ? (
              <div style={{ padding: "20px 0", color: C.muted, fontSize: 12.5, textAlign: "center" }}>
                Aucune demande soumise pour le moment.
              </div>
            ) : (
              stats.recentDemandes.slice(0, 3).map((d, i) => (
                <div
                  key={d.id || d.reference || i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: i % 2 === 0 ? "#fbfcfe" : "#ffffff",
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>
                      {d.reference || `#${d.id || i + 1}`}
                      {d.demandeur && (
                        <span style={{ fontWeight: 500, color: C.muted, marginLeft: 8 }}>
                          {d.demandeur.prenom} {d.demandeur.nom}
                        </span>
                      )}
                    </div>
                    {d.bien && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        Bien : {d.bien.nomDuBien || d.bien.localite}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 16,
                      background: d.statut === "VALIDEE" ? C.greenBg : d.statut === "EN_COURS" ? "#fef3c7" : "#eff6ff",
                      color: d.statut === "VALIDEE" ? C.green : d.statut === "EN_COURS" ? "#92400e" : C.blue,
                    }}
                  >
                    {d.statut || "EN_ATTENTE"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: 18,
            border: `1px solid ${C.border}`,
            padding: "22px 24px",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 12 }}>
            Taux d&apos;Approbation
          </div>
          <CircularGauge
            percentage={tauxSucces}
            sublabel={`${validees} validée(s) sur ${total}`}
          />
        </div>
      </div>

      {/* ── SECTION HISTORIQUE CHRONOLOGIQUE COMPLET ────────────── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 18,
          border: `1px solid ${C.border}`,
          padding: "22px 24px",
          boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
              Historique Chronologique de Traitement
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
              Journal de suivi complet de vos dossiers
            </div>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "ALL", label: "Toutes" },
              { id: "EN_ATTENTE", label: "En attente" },
              { id: "EN_COURS", label: "En cours" },
              { id: "VALIDEE", label: "Validées" },
              { id: "REJETEE", label: "Rejetées" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatut(f.id)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  border: filterStatut === f.id ? `1.5px solid ${C.gold}` : `1px solid ${C.border}`,
                  background: filterStatut === f.id ? C.goldBg : "#ffffff",
                  color: filterStatut === f.id ? C.goldDark : C.muted,
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredHistorique.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: C.muted, fontSize: 12.5 }}>
              Aucune entrée dans l&apos;historique.
            </div>
          ) : (
            filteredHistorique.map((demande, i) => (
              <div
                key={demande.id || demande.reference || i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "11px 14px",
                  background: i % 2 === 0 ? "#fbfcfe" : "#ffffff",
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>
                    {demande.reference || `#${demande.id || i + 1}`}
                    {demande.typeDemande && (
                      <span style={{ fontSize: 10.5, color: C.muted, marginLeft: 8 }}>
                        ({demande.typeDemande})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {demande.createdAt && (
                      <span>
                        Créée le {new Date(demande.createdAt).toLocaleDateString("fr-FR")} &bull;{" "}
                      </span>
                    )}
                    {demande.bien && (
                      <span>Bien : {demande.bien.nomDuBien || demande.bien.localite}</span>
                    )}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: 16,
                    background:
                      demande.statut === "VALIDEE"
                        ? C.greenBg
                        : demande.statut === "EN_COURS"
                        ? "#fef3c7"
                        : demande.statut === "REJETEE"
                        ? C.redBg
                        : "#eff6ff",
                    color:
                      demande.statut === "VALIDEE"
                        ? C.green
                        : demande.statut === "EN_COURS"
                        ? "#92400e"
                        : demande.statut === "REJETEE"
                        ? C.red
                        : C.blue,
                  }}
                >
                  {demande.statut || "EN_ATTENTE"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  PAGE PRINCIPALE EXPORTEE                                            */
/* ================================================================== */
export default function DashboardHome({
  onNavigate,
}: {
  onNavigate?: (key: string) => void;
}) {
  const [data, setData] = useState<UnifiedStats | null>(null);
  const [agentData, setAgentData] = useState<AgentDashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (user) setCurrentUser(user);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const stats = await dashboardApi.getStats();

        if (stats.type === "agent") {
          if (mounted) setAgentData(stats as AgentDashboardType);
        } else {
          let general: GeneralStats | null = null;
          try {
            general = await dashboardApi.getGeneralStats();
          } catch (generalError) {
            console.error("Erreur statistiques générales :", generalError);
          }
          if (mounted) setData(normalizeStats(stats, general));
        }
      } catch (err) {
        console.error("Erreur dashboard :", err);
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger le tableau de bord."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: 300,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          color: C.muted,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: `3px solid ${C.border}`,
            borderTopColor: C.gold,
            animation: "db-spin 0.8s linear infinite",
          }}
        />
        <span style={{ fontSize: 13 }}>Chargement de votre tableau de bord…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 14,
          padding: "22px 24px",
          color: "#b91c1c",
        }}
      >
        <strong>Erreur de chargement du tableau de bord</strong>
        <p style={{ marginTop: 8, fontSize: 13 }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 12,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#b91c1c",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (currentUser?.role === "AGENT" && agentData) {
    return <AgentDashboardLayout stats={agentData} onNavigate={onNavigate} />;
  }

  if (agentData && !data) {
    return <AgentDashboardLayout stats={agentData} onNavigate={onNavigate} />;
  }

  if (!data) return null;

  return <GeneralDashboardLayout data={data} onNavigate={onNavigate} />;
}
