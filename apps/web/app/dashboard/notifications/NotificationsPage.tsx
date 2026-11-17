"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./NotificationsPage.css";

import type { NotificationItem, NotificationStats } from "./types";
import { notificationsApi } from "./api";
import { useFeedback } from "../shared/feedback";

import NotificationStatsComponent from "./components/NotificationStats";
import NotificationFilters, { FilterTab } from "./components/NotificationFilters";
import NotificationCard from "./components/NotificationCard";

interface Props {
  onNavigate?: (moduleKey: string) => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function NotificationsPage({ onNavigate }: Props) {
  const { toast, confirmDelete } = useFeedback();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("TOUTES");
  const [search, setSearch] = useState("");

  // ── Chargement des notifications ────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await notificationsApi.getMesNotifications();
      setNotifications(data);
    } catch (e: unknown) {
      console.error("Erreur notifications:", e);
      setLoadError(
        getErrorMessage(e, "Impossible de charger les notifications.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handleNotificationCreated = (event: Event) => {
      const notification = (event as CustomEvent<NotificationItem>).detail;
      if (!notification?.id) return;
      setNotifications((previous) =>
        previous.some((item) => item.id === notification.id)
          ? previous
          : [notification, ...previous],
      );
    };

    window.addEventListener("notifications:created", handleNotificationCreated);
    return () =>
      window.removeEventListener("notifications:created", handleNotificationCreated);
  }, []);

  // ── Scanner et générer les alertes ──────────────────────────────────
  const handleScannerAlertes = async () => {
    setScanning(true);
    try {
      const res = await notificationsApi.genererAlertes();
      toast.success("Analyse terminée", res.message || "Vérification des alertes effectuée.");
      await loadNotifications();
    } catch (e: unknown) {
      toast.error(
        "Échec de l'analyse",
        getErrorMessage(e, "Erreur lors du scan.")
      );
    } finally {
      setScanning(false);
    }
  };

  // ── Marquer tout comme lu ───────────────────────────────────────────
  const handleToutMarquerLu = async () => {
    try {
      await notificationsApi.marquerToutesLues();
      setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
      toast.success("Succès", "Toutes les notifications ont été marquées comme lues.");
    } catch (e: unknown) {
      toast.error("Erreur", getErrorMessage(e, "Impossible de marquer les notifications comme lues."));
    }
  };

  // ── Marquer une notification comme lue ──────────────────────────────
  const handleToggleLu = async (id: string, actuellementLue: boolean) => {
    try {
      if (actuellementLue) {
        await notificationsApi.marquerCommeNonLue(id);
      } else {
        await notificationsApi.marquerCommeLue(id);
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lu: !actuellementLue } : n))
      );
    } catch (e: unknown) {
      toast.error("Erreur", getErrorMessage(e, "Impossible de modifier l'état de lecture."));
    }
  };

  // ── Supprimer une notification ──────────────────────────────────────
  const handleSupprimer = async (notif: NotificationItem) => {
    const ok = await confirmDelete({
      title: "Supprimer la notification",
      itemName: notif.titre,
      message: "Êtes-vous sûr de vouloir retirer cette notification de votre historique ?",
      confirmLabel: "Supprimer",
    });

    if (!ok) return;

    try {
      await notificationsApi.supprimer(notif.id);
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      toast.success("Supprimée", "La notification a été supprimée.");
    } catch (e: unknown) {
      toast.error(
        "Erreur de suppression",
        getErrorMessage(e, "Impossible de supprimer la notification.")
      );
    }
  };

  // ── Calcul des statistiques ─────────────────────────────────────────
  const stats: NotificationStats = useMemo(() => {
    const total = notifications.length;
    const nonLues = notifications.filter((n) => !n.lu).length;
    const alertesDelai = notifications.filter((n) => n.type === "ALERTE_DELAI").length;
    const validations = notifications.filter((n) => n.type === "VALIDATION").length;
    const retards = notifications.filter((n) => n.type === "RETARD_TRAVAUX").length;

    return { total, nonLues, alertesDelai, validations, retards };
  }, [notifications]);

  // ── Calcul des compteurs par onglet ─────────────────────────────────
  const counts = useMemo(() => {
    const map: Record<FilterTab, number> = {
      TOUTES: notifications.length,
      NON_LUES: notifications.filter((n) => !n.lu).length,
      ALERTE_DELAI: notifications.filter((n) => n.type === "ALERTE_DELAI").length,
      VALIDATION: notifications.filter((n) => n.type === "VALIDATION").length,
      RETARD_TRAVAUX: notifications.filter((n) => n.type === "RETARD_TRAVAUX").length,
      RECENSEMENT: notifications.filter((n) => n.type === "RECENSEMENT").length,
      SYSTEME: notifications.filter((n) => n.type === "SYSTEME").length,
      ANOMALIE: notifications.filter((n) => n.type === "ANOMALIE").length,
    };
    return map;
  }, [notifications]);

  // ── Filtrage des éléments ───────────────────────────────────────────
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      // Filtre onglet
      if (activeTab === "NON_LUES" && n.lu) return false;
      if (activeTab !== "TOUTES" && activeTab !== "NON_LUES" && n.type !== activeTab) {
        return false;
      }

      // Filtre recherche
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          n.titre.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.lien || "").toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [notifications, activeTab, search]);

  return (
    <div className="notif-page">
      {/* Header */}
      <div className="notif-header">
        <div className="notif-header-title">
          <div className="notif-header-icon">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h2>Centre d&apos;alertes & Notifications</h2>
            <p>Suivi en temps réel des échéances, validations et retards de chantiers</p>
          </div>
        </div>

        <div className="notif-header-actions">
          <button
            type="button"
            className="notif-btn-secondary"
            onClick={handleScannerAlertes}
            disabled={scanning}
            title="Analyser les baux et chantiers pour générer les alertes"
          >
            <svg
              width="15"
              height="15"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ animation: scanning ? "spin 1s linear infinite" : "none" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{scanning ? "Scan en cours..." : "Scanner les alertes"}</span>
          </button>

          {stats.nonLues > 0 && (
            <button
              type="button"
              className="notif-btn-primary"
              onClick={handleToutMarquerLu}
            >
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Tout marquer comme lu</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <NotificationStatsComponent stats={stats} />

      {/* Filtres & Recherche */}
      <NotificationFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        counts={counts}
      />

      {/* Liste des notifications */}
      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--mef-muted)", fontSize: 14 }}>
          Chargement des notifications en cours...
        </div>
      ) : loadError ? (
        <div
          role="alert"
          style={{
            padding: "24px",
            textAlign: "center",
            background: "#fef2f2",
            borderRadius: 16,
            border: "1px solid #fecaca",
            color: "#b91c1c",
          }}
        >
          <p>{loadError}</p>
          <button
            type="button"
            className="notif-btn-secondary"
            onClick={loadNotifications}
            style={{ margin: "12px auto 0" }}
          >
            Réessayer
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "#ffffff",
            borderRadius: 16,
            border: "1px dashed var(--mef-border, #e2e8f0)",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "#f1f5f9",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            Aucune alerte à afficher
          </h3>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            {search
              ? "Aucun message ne correspond à votre filtre de recherche."
              : "Toutes vos alertes sont à jour et traitées."}
          </p>
        </div>
      ) : (
        <div className="notif-list">
          {filtered.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onToggleLu={handleToggleLu}
              onSupprimer={handleSupprimer}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
