"use client";

import React from "react";
import type { NotificationItem, TypeNotification } from "../types";

interface Props {
  notification: NotificationItem;
  onToggleLu: (id: string, actuellementLue: boolean) => void;
  onSupprimer: (notif: NotificationItem) => void;
  onNavigate?: (moduleKey: string) => void;
}

export const typeConfig: Record<
  TypeNotification,
  {
    label: string;
    border: string;
    accent: string;
    accentBg: string;
    icon: React.ReactNode;
  }
> = {
  ALERTE_DELAI: {
    label: "Alerte Délai",
    border: "#ef4444",
    accent: "#dc2626",
    accentBg: "#fee2e2",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  VALIDATION: {
    label: "Validation Requise",
    border: "#10b981",
    accent: "#059669",
    accentBg: "#dcfce7",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  RETARD_TRAVAUX: {
    label: "Retard Chantier",
    border: "#f97316",
    accent: "#ea580c",
    accentBg: "#ffedd5",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  RECENSEMENT: {
    label: "Recensement Annuel",
    border: "#6366f1",
    accent: "#4f46e5",
    accentBg: "#e0e7ff",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  ANOMALIE: {
    label: "Alerte Conformité",
    border: "#f43f5e",
    accent: "#e11d48",
    accentBg: "#ffe4e6",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  SYSTEME: {
    label: "Message Système",
    border: "#C9A227",
    accent: "#A67C00",
    accentBg: "#fefce8",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

function formatTimeAgo(iso: string) {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
}

export default function NotificationCard({
  notification,
  onToggleLu,
  onSupprimer,
  onNavigate,
}: Props) {
  const cfg = typeConfig[notification.type] || typeConfig.SYSTEME;

  return (
    <div
      className={`notif-card ${notification.lu ? "read" : "unread"}`}
      style={{ borderLeftColor: cfg.border }}
    >
      {/* Icon */}
      <div
        className="notif-card-icon"
        style={{
          background: cfg.accentBg,
          color: cfg.accent,
        }}
      >
        {cfg.icon}
      </div>

      {/* Main Content */}
      <div className="notif-card-main">
        <div className="notif-card-top">
          <div className="notif-card-meta">
            <span
              className="notif-type-pill"
              style={{
                background: cfg.accentBg,
                color: cfg.accent,
              }}
            >
              {cfg.label}
            </span>
            <span className="notif-time">{formatTimeAgo(notification.createdAt)}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!notification.lu && <div className="notif-unread-dot" title="Non lu" />}
          </div>
        </div>

        <h3 className="notif-card-title">{notification.titre}</h3>
        <p className="notif-card-msg">{notification.message}</p>
      </div>

      {/* Actions */}
      <div className="notif-card-actions">
        {notification.lien && onNavigate && (
          <button
            type="button"
            className="notif-btn-link"
            onClick={() => onNavigate(notification.lien!)}
            title="Consulter le module associé"
          >
            <span>Consulter</span>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        )}

        <button
          type="button"
          className="notif-btn-icon"
          title={notification.lu ? "Marquer comme non lue" : "Marquer comme lue"}
          aria-label={notification.lu ? "Marquer comme non lue" : "Marquer comme lue"}
          onClick={() => onToggleLu(notification.id, notification.lu)}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {notification.lu ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            )}
          </svg>
        </button>

        <button
          type="button"
          className="notif-btn-icon danger"
          title="Supprimer la notification"
          onClick={() => onSupprimer(notification)}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
