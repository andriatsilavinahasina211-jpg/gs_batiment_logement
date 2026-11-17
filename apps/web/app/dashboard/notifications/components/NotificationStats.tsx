"use client";

import React from "react";
import type { NotificationStats } from "../types";

interface Props {
  stats: NotificationStats;
}

export default function NotificationStatsComponent({ stats }: Props) {
  return (
    <div className="notif-stats-grid">
      {/* Total */}
      <div className="notif-stat-card">
        <div
          className="notif-stat-icon"
          style={{ background: "#f1f5f9", color: "#475569" }}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div>
          <div className="notif-stat-value">{stats.total}</div>
          <div className="notif-stat-label">Total notifications</div>
        </div>
      </div>

      {/* Non lues */}
      <div className="notif-stat-card">
        <div
          className="notif-stat-icon"
          style={{ background: "#fef3c7", color: "#d97706" }}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <div className="notif-stat-value" style={{ color: "#d97706" }}>
            {stats.nonLues}
          </div>
          <div className="notif-stat-label">À traiter / Non lues</div>
        </div>
      </div>

      {/* Alertes Délais & Échéances */}
      <div className="notif-stat-card">
        <div
          className="notif-stat-icon"
          style={{ background: "#fee2e2", color: "#dc2626" }}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div className="notif-stat-value" style={{ color: "#dc2626" }}>
            {stats.alertesDelai}
          </div>
          <div className="notif-stat-label">Alertes Délais (Baux/Sorties)</div>
        </div>
      </div>

      {/* Validations & Retards */}
      <div className="notif-stat-card">
        <div
          className="notif-stat-icon"
          style={{ background: "#dcfce7", color: "#16a34a" }}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div className="notif-stat-value" style={{ color: "#16a34a" }}>
            {stats.validations}
          </div>
          <div className="notif-stat-label">Validations en attente</div>
        </div>
      </div>
    </div>
  );
}

