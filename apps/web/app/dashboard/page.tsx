"use client";

import Image from "next/image";
import React, { useState, useEffect, useCallback } from "react";
import { getStoredUser, logoutUser } from "../lib/auth";
import "./styles.css";

import { FeedbackProvider, useToast } from "./shared/feedback";
import { ErrorBoundary } from "./shared/ErrorBoundary";
import type { NotificationItem } from "./notifications/types";

import { C, PAGE_TITLES, NavGroup } from "./shared/constants";
import { Ic } from "./shared/icons";

// Import des pages indépendantes
import DashboardHome from "../dashboard/DashboardHome";
import BiensPage from "./bien/BiensPage";
import OccupantsPage from "./occupants/OccupantsPage";
import OccupationsPage from "./occupations/OccupationsPage";
import LiberationsPage from "./liberations/LiberationsPage";
import BauxPage from "./baux/BauxPage";
import DemandesPage from "./demandes/DemandesPage";
import AttestationsPage from "./attestations/AttestationsPage";
import RecensementPage from "./recensements/RecensementsPage";
import TravauxPage from "./travaux/TravauxPage";
import NotificationsPage from "./notifications/NotificationsPage";
// import DocumentsPage from "./documents/DocumentsPage";
import PiecesJointesPage from "./pieces-jointes/PiecesJointesPage";
import AuditPage from "./audit/AuditPage";
import IAPage from "./ia/IAPage";
import UsersPage from "./users/UsersPage";

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Gestion immobilière",
    items: [
      { label: "Tableau de bord", key: "dashboard", Icon: Ic.Dashboard },
      { label: "Biens", key: "biens", Icon: Ic.Biens },
      { label: "Occupants", key: "occupants", Icon: Ic.Occupants },
      { label: "Occupations", key: "occupations", Icon: Ic.Occupations },
      { label: "Libérations", key: "liberations", Icon: Ic.Liberation },
      { label: "Baux", key: "bail", Icon: Ic.Bail },
    ],
  },
  {
    group: "Processus",
    items: [
      { label: "Demandes", key: "demandes", Icon: Ic.Demandes },
      { label: "Attestations", key: "attestations", Icon: Ic.Attestations },
      { label: "Recensement", key: "recensement", Icon: Ic.Recensement },
      { label: "Travaux", key: "travaux", Icon: Ic.Travaux },
    ],
  },
  {
    group: "Système",
    items: [
      { label: "Notifications", key: "notifications", Icon: Ic.Notifications },
      // { label: "Documents", key: "documents", Icon: Ic.Documents },
      { label: "Pièces jointes", key: "pieces-jointes", Icon: Ic.PiecesJointes },
      { label: "Audit", key: "audit", Icon: Ic.Audit },
      { label: "Assistant Intelligent", key: "ia", Icon: Ic.IA },
      { label: "Utilisateurs", key: "users", Icon: Ic.Users },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════
// PERMISSIONS PAR RÔLE
// ADMINISTRATEUR → tout
// CHEF_SRB       → tout sauf "users"
// AGENT          → dashboard, demandes, occupants, biens, ia, notifications
// ══════════════════════════════════════════════════════════════════════
const ALL_MODULES = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.key));

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMINISTRATEUR: ALL_MODULES,
  CHEF_SRB: ALL_MODULES.filter((k) => k !== "users"),
  AGENT: ["dashboard", "demandes", "occupants", "biens", "ia", "notifications"],
};

function canAccess(role: string | undefined, key: string): boolean {
  if (key === "dashboard") return true;
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] ?? []).includes(key);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const BADGE_ENDPOINTS: Record<string, string> = {
  biens: "/dashboard/biens",
  occupants: "/dashboard/occupants",
  occupations: "/dashboard/occupations",
  liberations: "/dashboard/occupations?statut=DEMANDE_LIBERATION",
  bail: "/dashboard/baux",
  demandes: "/dashboard/demandes",
  attestations: "/dashboard/attestations",
  recensement: "/dashboard/recensement/quitus",
  travaux: "/dashboard/travaux",
  notifications: "/dashboard/notifications",
};

const SEEN_KEY = "siglbahm_nav_seen";
const REFRESH_MS = 30000;

function readSeen(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); } catch { return {}; }
}
function writeSeen(seen: Record<string, number>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
}

// Compte les éléments quel que soit le format de réponse de l'API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function countItems(json: any): number {
  if (Array.isArray(json)) return json.length;
  if (typeof json?.total === "number") return json.total;
  if (typeof json?.count === "number") return json.count;
  if (Array.isArray(json?.data)) return json.data.length;
  if (typeof json?.meta?.total === "number") return json.meta.total;
  return 0;
}

function getToken(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u: any = getStoredUser();
  return u?.token || u?.accessToken || localStorage.getItem("token");
}

/** À appeler depuis n'importe quelle page après un ajout :
 *  window.dispatchEvent(new Event("nav:refresh")); */
export function refreshNavBadges() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("nav:refresh"));
}

function useNavBadges(role: string | undefined, activeKey: string) {
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [seen, setSeen] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!role) return;
    const token = getToken();
    const keys = Object.keys(BADGE_ENDPOINTS).filter((k) => canAccess(role, k));
    const results = await Promise.all(
      keys.map(async (k) => {
        try {
          const res = await fetch(`${API_URL}${BADGE_ENDPOINTS[k]}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) return [k, null] as const;
          return [k, countItems(await res.json())] as const;
        } catch {
          return [k, null] as const;
        }
      })
    );

    const next: Record<string, number> = {};
    results.forEach(([k, v]) => { if (v !== null) next[k] = v; });

    // Première connexion : on part de zéro nouveauté
    const s = readSeen();
    let changed = false;
    Object.entries(next).forEach(([k, v]) => {
      if (s[k] === undefined) { s[k] = v; changed = true; }
    });
    if (changed) writeSeen(s);

    setSeen(s);
    setTotals(next);
  }, [role]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    window.addEventListener("nav:refresh", load);
    return () => {
      clearInterval(id);
      window.removeEventListener("nav:refresh", load);
    };
  }, [load]);

  // Ouvrir un module = marquer ses éléments comme vus
  useEffect(() => {
    if (totals[activeKey] === undefined) return;
    const s = readSeen();
    if (s[activeKey] !== totals[activeKey]) {
      s[activeKey] = totals[activeKey];
      writeSeen(s);
      setSeen({ ...s });
    }
  }, [activeKey, totals]);

  const badgeFor = (key: string): number => {
    const t = totals[key];
    if (t === undefined) return 0;
    return Math.max(0, t - (seen[key] ?? t));
  };

  const totalBadges = Object.keys(totals).reduce((sum, k) => sum + badgeFor(k), 0);
  return { badgeFor, totalBadges };
}

function RealtimeNotificationListener({ userId }: { userId?: number }) {
  const showToast = useToast().info;

  useEffect(() => {
    const token = getToken();
    if (!userId || !token) return;

    const controller = new AbortController();
    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 1000;

    const connect = async () => {
      while (!stopped) {
        try {
          const response = await fetch(`${API_URL}/dashboard/notifications/events`, {
            headers: { Authorization: "Bearer " + token },
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(`Connexion aux notifications refusée (HTTP ${response.status})`);
          }
          if (!response.body) {
            throw new Error("Le flux des notifications est indisponible.");
          }

          retryDelay = 1000;
          window.dispatchEvent(new Event("nav:refresh"));
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!stopped) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let boundary = /\r?\n\r?\n/.exec(buffer);
            while (boundary) {
              const frame = buffer.slice(0, boundary.index);
              buffer = buffer.slice(boundary.index + boundary[0].length);
              const data = frame
                .split(/\r?\n/)
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).trimStart())
                .join("\n");

              if (data) {
                try {
                  const notification = JSON.parse(data) as NotificationItem;
                  if (typeof notification.id === "string") {
                    window.dispatchEvent(
                      new CustomEvent("notifications:created", { detail: notification }),
                    );
                    window.dispatchEvent(new Event("nav:refresh"));
                    showToast(notification.titre, notification.message, 7000);
                  }
                } catch (error) {
                  console.error("Événement de notification invalide :", error);
                }
              }
              boundary = /\r?\n\r?\n/.exec(buffer);
            }
          }

          if (!stopped) throw new Error("Le flux des notifications a été interrompu.");
        } catch (error) {
          if (stopped || controller.signal.aborted) break;
          console.error("Connexion temps réel aux notifications interrompue :", error);
          await new Promise<void>((resolve) => {
            retryTimer = setTimeout(resolve, retryDelay);
          });
          retryDelay = Math.min(retryDelay * 2, 15000);
        }
      }
    };

    void connect();
    return () => {
      stopped = true;
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [showToast, userId]);

  return null;
}

// ── Composant "Accès refusé" ───────────────────────────────────────────
function AccessDenied({ moduleName }: { moduleName: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 320,
        gap: 16,
        textAlign: "center",
      }}
    >
      {/* Icône cadenas */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "#fee2e2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 0 8px rgba(239,68,68,0.1)",
        }}
      >
        <svg
          width="34"
          height="34"
          fill="none"
          viewBox="0 0 24 24"
          stroke="#dc2626"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>

      {/* Texte */}
      <div>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: C.text,
            margin: 0,
          }}
        >
          Accès restreint
        </h3>
        <p
          style={{
            fontSize: 13,
            color: C.muted,
            marginTop: 8,
            maxWidth: 360,
            lineHeight: 1.6,
          }}
        >
          Vous n&apos;avez pas les droits nécessaires pour accéder au module{" "}
          <strong style={{ color: C.text }}>« {moduleName} »</strong>.
          <br />
          Contactez votre administrateur si vous pensez que c&apos;est une erreur.
        </p>
      </div>

      {/* Badge rôle */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          borderRadius: 20,
          background: "#fef3c7",
          border: "1px solid #fde68a",
          fontSize: 12,
          fontWeight: 600,
          color: "#92400e",
        }}
      >
        <svg
          width="13"
          height="13"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Module non accessible avec votre rôle actuel
      </div>
    </div>
  );
}

function CompanyAvatar() {
  return (
    <div style={{
      width: 52, height: 52, borderRadius: 14,
      background: `linear-gradient(145deg,${C.goldDark},${C.gold})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, boxShadow: `0 4px 14px ${C.gold}55`,
    }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="1.6" />
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const [activeKey, setActiveKey] = useState<string>("dashboard");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (user) setCurrentUser(user);
  }, []);

  // ── Filtrage de la navigation selon le rôle de l'utilisateur ─────────
  // Chaque item n'est affiché que si canAccess() le permet.
  // ADMINISTRATEUR  → tout visible
  // CHEF_SRB        → tout sauf "users"
  // AGENT           → dashboard, demandes, occupants, biens, ia, notifications
  const { badgeFor, totalBadges } = useNavBadges(currentUser?.role, activeKey);

  const filteredNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      canAccess(currentUser?.role, item.key)
    ),
  })).filter((group) => group.items.length > 0); // supprimer groupes vides


  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "ADMINISTRATEUR": return "Administrateur";
      case "CHEF_SRB": return "Chef de Service DPE";
      case "AGENT": return "Agent SRB";
      default: return role || "Agent SRB";
    }
  };

  const userInitials = currentUser
    ? `${currentUser.prenom?.[0] || ""}${currentUser.nom?.[0] || ""}`.toUpperCase() || "SR"
    : "AD";

  const userDisplayName = currentUser
    ? `${currentUser.prenom || ""} ${currentUser.nom || ""}`.trim() || currentUser.email
    : "Administrateur SRB";

  const currentPage = PAGE_TITLES[activeKey] || { title: "Page", subtitle: "" };
  const currentDateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Rendu conditionnel avec vérification des droits ──────────────────
  // Chaque page vérifie canAccess() avant d'être rendue.
  // Si l'utilisateur n'a pas le droit → page "Accès refusé" affichée.
  const renderContent = () => {
    // "dashboard" est toujours accessible (tous les rôles)
    if (activeKey === "dashboard") return <DashboardHome onNavigate={setActiveKey} />;

    // Pour tous les autres modules : vérification du rôle
    if (!canAccess(currentUser?.role, activeKey)) {
      return <AccessDenied moduleName={PAGE_TITLES[activeKey]?.title || activeKey} />;
    }

    switch (activeKey) {
      case "biens":          return <BiensPage />;
      case "occupants":      return <OccupantsPage />;
      case "occupations":    return <OccupationsPage />;
      case "liberations":    return <LiberationsPage />;
      case "bail":           return <BauxPage />;
      case "demandes":       return <DemandesPage />;
      case "attestations":   return <AttestationsPage />;
      case "recensement":    return <RecensementPage />;
      case "travaux":        return <TravauxPage />;
      case "notifications":  return <NotificationsPage onNavigate={setActiveKey} />;
      case "pieces-jointes": return <PiecesJointesPage />;
      case "audit":          return <AuditPage />;
      case "ia":             return <IAPage onNavigate={setActiveKey} />;
      case "users":          return <UsersPage />;
      default:               return <DashboardHome />;
    }
  };

  return (
    <FeedbackProvider>
      <div className="db" style={{ display: "flex", height: "100vh", background: C.bg, overflow: "hidden" }}>
        <RealtimeNotificationListener userId={currentUser?.id} />
        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            className="db-overlay open"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.5)",
              zIndex: 90,
              backdropFilter: "blur(2px)",
            }}
          />
        )}

      {/* SIDEBAR */}
      <aside
        className={`db-sidebar ${sidebarOpen ? "open" : ""}`}
        style={{
          background: C.sidebar,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          borderRight: `1px solid ${C.sidebarBdr}`,
          zIndex: 50,
        }}
      >
        <div className="db-logo-area" style={{ position: "relative" }}>
          <button
            type="button"
            className="db-sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            title="Fermer le menu"
            aria-label="Fermer le menu"
          >
            ✕
          </button>
          <Image src="/logo_mef.png" alt="MEF Madagascar" width={56} height={56} style={{ objectFit: "contain" }} priority />
          <div className="db-logo-text-box">
            <div className="db-logo-text">GESTION DES BATIMENTS <br />ET LOGEMENTS ADMINISTRATIFS</div>
            <div className="db-logo-sub">SRB — Haute Matsiatra</div>
          </div>
        </div>

        <nav className="db-sidebar-nav" style={{ flex: 1, overflowY: "auto", padding: "4px 8px 12px" }}>
          {filteredNavGroups.map(({ group, items }) => (
            <div key={group}>
              <div className="db-group-lbl">{group}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {items.map(({ label, key, Icon }) => {
                  const badge = badgeFor(key);
                  return (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveKey(key);
                      setSidebarOpen(false);
                    }}
                    className={`db-nav${activeKey === key ? " act" : ""}`}
                    title={label}
                  >
                    <div className="db-nav-row">
                      <span className="db-nav-ic"><Icon /></span>
                      <span className="db-nav-lbl">{label}</span>
                      {badge > 0 && (
                        <span className="db-badge">{badge > 99 ? "99+" : badge}</span>
                      )}
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="db-sidebar-footer">
          <div className="db-sidebar-user">
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: `linear-gradient(135deg,${C.gold},${C.goldDark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, color: "white", fontSize: 11, fontWeight: 700,
            }}>
              {userInitials}
            </div>
            <div style={{ minWidth: 0, overflow: "hidden", flex: 1 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: C.text,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
              }}>
                {userDisplayName}
              </div>
              <div style={{ fontSize: 10.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {getRoleLabel(currentUser?.role)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logoutUser()}
            className="db-sidebar-logout"
            title="Déconnexion"
            aria-label="Se déconnecter"
          >
            <Ic.Logout />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="db-main" style={{ flex: 1, overflow: "auto" }}>
        {/* Header dynamique */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 20, flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              type="button"
              className={`db-mobile-menu-btn ${sidebarOpen ? "active" : ""}`}
              onClick={() => setSidebarOpen((prev) => !prev)}
              title={sidebarOpen ? "Fermer le menu" : "Menu"}
              aria-label={sidebarOpen ? "Fermer le menu" : "Menu"}
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                border: `1px solid ${sidebarOpen ? C.gold : C.border}`,
                background: sidebarOpen ? "#fefce8" : C.card,
                cursor: "pointer",
                color: sidebarOpen ? C.goldDark : C.muted,
                transition: "all 0.15s ease",
              }}
            >
              {sidebarOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <Ic.MenuDots />
              )}
            </button>

            <CompanyAvatar />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-.3px" }}>
                {currentPage.title}
              </h1>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 2, display: "flex", flexWrap: "wrap", gap: "0 6px" }}>
                {currentPage.subtitle}
                {activeKey === "dashboard" && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{currentDateStr}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="db-header-actions">
            {activeKey === "dashboard" && (
              <button
                className="db-refresh-btn"
                title="Actualiser le tableau de bord"
                onClick={() => window.location.reload()}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                Actualiser
              </button>
            )}
            {/* Bouton notifications (selon le rôle) */}
            {canAccess(currentUser?.role, "notifications") && (
              <button
                className="db-icon-btn"
                title="Notifications"
                onClick={() => setActiveKey("notifications")}
              >
                <Ic.Notifications />
                {totalBadges > 0 && <span className="db-icon-btn-dot" />}
              </button>
            )}
          </div>
        </div>

        {/* Contenu de la page active sécurisé par ErrorBoundary */}
        <ErrorBoundary key={activeKey} fallbackTitle={`Erreur dans le module ${currentPage.title}`}>
          {renderContent()}
        </ErrorBoundary>
      </main>
    </div>
    </FeedbackProvider>
  );
}