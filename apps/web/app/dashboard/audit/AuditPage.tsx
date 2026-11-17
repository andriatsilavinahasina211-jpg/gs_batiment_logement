
"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";

import "./AuditPage.css";
import type { AuditLog } from "./types";
import { auditApi } from "./auditservice";
import { useFeedback } from "../shared/feedback";

const ITEMS_PER_PAGE = 10;

const actionConfig: Record<
  "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT",
  { label: string; color: string; bg: string }
> = {
  CREATE: {
    label: "Création",
    color: "#16a34a",
    bg: "#dcfce7",
  },
  UPDATE: {
    label: "Modification",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  DELETE: {
    label: "Suppression",
    color: "#dc2626",
    bg: "#fee2e2",
  },
  LOGIN: {
    label: "Connexion",
    color: "#7c3aed",
    bg: "#ede9fe",
  },
  LOGOUT: {
    label: "Déconnexion",
    color: "#64748b",
    bg: "#f1f5f9",
  },
};

const getActionConfig = (action: string) => {
  const normalized = action.toUpperCase();

  if (
    normalized.includes("CREATE") ||
    normalized.includes("CREATION")
  ) {
    return actionConfig.CREATE;
  }

  if (
    normalized.includes("UPDATE") ||
    normalized.includes("MODIFICATION")
  ) {
    return actionConfig.UPDATE;
  }

  if (
    normalized.includes("DELETE") ||
    normalized.includes("SUPPRESSION")
  ) {
    return actionConfig.DELETE;
  }

  if (
    normalized.includes("LOGIN") ||
    normalized.includes("CONNEXION")
  ) {
    return actionConfig.LOGIN;
  }

  if (
    normalized.includes("LOGOUT") ||
    normalized.includes("DECONNEXION")
  ) {
    return actionConfig.LOGOUT;
  }

  return {
    label: action,
    color: "#64748b",
    bg: "#f1f5f9",
  };
};

const formatDate = (iso?: string) => {
  if (!iso) return "—";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDetails = (details: AuditLog["details"]) => {
  if (!details) return "Aucun détail disponible.";

  if (typeof details === "string") return details;

  return JSON.stringify(details, null, 2);
};

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="audit-info-row">
      <span className="audit-info-label">{label}</span>
      <span className="audit-info-value">{value || "—"}</span>
    </div>
  );
}

/* ───────────────── Modal détail ───────────────── */

function AuditDetailModal({
  log,
  onClose,
  onHistory,
}: {
  log: AuditLog;
  onClose: () => void;
  onHistory: (log: AuditLog) => void;
}) {
  const actionStyle = getActionConfig(log.action);

  return (
    <div className="audit-modal-overlay" onClick={onClose}>
      <div
        className="audit-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="audit-detail-header">
          <div>
            <h2>Détails de l'opération</h2>
            <p>
              {log.action} · {log.entity}
            </p>
          </div>

          <button
            type="button"
            className="audit-detail-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="audit-detail-body">
          <div className="audit-detail-infos">
            <div className="audit-info-row">
              <span className="audit-info-label">Action</span>

              <span
                className="audit-badge"
                style={{
                  background: actionStyle.bg,
                  color: actionStyle.color,
                }}
              >
                {actionStyle.label}
              </span>
            </div>

            <InfoRow label="Identifiant" value={String(log.id)} />
            <InfoRow label="Entité" value={log.entity} />
            <InfoRow
              label="Identifiant entité"
              value={log.entityId}
            />
            <InfoRow label="Utilisateur" value={log.userNom} />
            <InfoRow
              label="Matricule"
              value={log.userMatricule}
            />
            <InfoRow label="Rôle" value={log.userRole} />
            <InfoRow label="Adresse IP" value={log.ipAddress} />
            <InfoRow
              label="Date"
              value={formatDate(log.createdAt)}
            />
          </div>

          <div className="audit-detail-extra">
            <h3>Informations complémentaires</h3>

            <pre>
              {formatDetails(log.details)}
            </pre>
          </div>

          {log.entityId && (
            <button
              type="button"
              className="audit-btn-primary"
              onClick={() => onHistory(log)}
            >
              Consulter l'historique de cette entité
            </button>
          )}

          <button
            type="button"
            className="audit-btn-secondary"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Modal historique ───────────────── */

function AuditHistoryModal({
  history,
  loading,
  onClose,
}: {
  history: AuditLog[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="audit-modal-overlay" onClick={onClose}>
      <div
        className="audit-history-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="audit-detail-header">
          <div>
            <h2>Historique de l'entité</h2>
            <p>Liste des opérations associées à cette entité</p>
          </div>

          <button
            type="button"
            className="audit-detail-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="audit-history-body">
          {loading ? (
            <div className="audit-empty">
              Chargement de l'historique…
            </div>
          ) : history.length === 0 ? (
            <div className="audit-empty">
              Aucun historique disponible.
            </div>
          ) : (
            <div className="audit-history-list">
              {history.map((item) => {
                const style = getActionConfig(item.action);

                return (
                  <div className="audit-history-item" key={item.id}>
                    <div className="audit-history-item-header">
                      <span
                        className="audit-badge"
                        style={{
                          background: style.bg,
                          color: style.color,
                        }}
                      >
                        {style.label}
                      </span>

                      <span className="audit-date">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <p className="audit-history-user">
                      Utilisateur : {item.userNom}
                    </p>

                    <p className="audit-history-role">
                      Matricule : {item.userMatricule || "—"}
                    </p>

                    {item.details && (
                      <pre className="audit-history-details">
                        {formatDetails(item.details)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            className="audit-btn-secondary"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Page principale ───────────────── */

export default function AuditPage() {
  const { toast } = useFeedback();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [history, setHistory] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filtreAction, setFiltreAction] = useState("TOUS");
  const [filtreEntite, setFiltreEntite] = useState("TOUS");

  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Charger les audits depuis le backend
  const loadAudits = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await auditApi.getAll({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: search.trim() || undefined,
        action:
          filtreAction !== "TOUS"
            ? filtreAction
            : undefined,
        entite:
          filtreEntite !== "TOUS"
            ? filtreEntite
            : undefined,
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
      });

      setLogs(
        result.data.map((log) => ({
          ...log,
          id: String(log.id),
          entityId:
            log.entityId == null
              ? undefined
              : String(log.entityId),
        }))
      );

      setTotal(result.total);
      setTotalPages(Math.max(1, result.totalPages));
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "Impossible de charger le journal d'audit.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    search,
    filtreAction,
    filtreEntite,
    dateDebut,
    dateFin,
  ]);

  useEffect(() => {
    loadAudits();
  }, [loadAudits, refreshKey]);

  // Options de filtres issues des données chargées
  const actionsDisponibles = useMemo(() => {
    return Array.from(
      new Set(logs.map((log) => log.action).filter(Boolean))
    );
  }, [logs]);

  const entitesDisponibles = useMemo(() => {
    return Array.from(
      new Set(logs.map((log) => log.entity).filter(Boolean))
    );
  }, [logs]);

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearch("");
    setFiltreAction("TOUS");
    setFiltreEntite("TOUS");
    setDateDebut("");
    setDateFin("");
    setCurrentPage(1);
  };

  // Ouvrir l'historique d'une entité
  const handleHistory = async (log: AuditLog) => {
    if (!log.entityId) {
      toast.error(
        "Historique indisponible",
        "Cet enregistrement ne possède pas d'identifiant d'entité."
      );
      return;
    }

    setShowHistory(true);
    setHistory([]);
    setHistoryLoading(true);

    try {
      const result = await auditApi.getByEntite(
        log.entity,
        log.entityId
      );

      setHistory(
        result.map((item) => ({
          ...item,
          id: String(item.id),
          entityId:
            item.entityId == null
              ? undefined
              : String(item.entityId),
        }))
      );
      setSelected(null);
    } catch (e: unknown) {
      toast.error(
        "Erreur",
        e instanceof Error
          ? e.message
          : "Impossible de récupérer l'historique."
      );

      setShowHistory(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  // Pagination
  const startIndex =
    total === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;

  const endIndex = Math.min(
    currentPage * ITEMS_PER_PAGE,
    total
  );

  return (
    <div className="audit-page">

      {/* En-tête */}
      <div className="audit-header">
        <div>
          <h2>Journal d'audit</h2>
          <p>
            {total} opération{total > 1 ? "s" : ""} enregistrée
            {total > 1 ? "s" : ""} — traçabilité des activités
          </p>
        </div>

        <button
          type="button"
          className="audit-btn-primary"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? "Actualisation…" : "↻ Actualiser"}
        </button>
      </div>

      {/* Statistiques */}
      <div className="audit-stats">
        <div className="audit-stat-card">
          <div className="audit-stat-icon audit-stat-blue">
            <span>▤</span>
          </div>

          <div>
            <p>Total des opérations</p>
            <strong>{total}</strong>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-icon audit-stat-green">
            <span>✓</span>
          </div>

          <div>
            <p>Opérations affichées</p>
            <strong>{logs.length}</strong>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="audit-filters">
        <div className="audit-filters-header">
          <h3>Recherche et filtres</h3>

          <button
            type="button"
            className="audit-reset-btn"
            onClick={resetFilters}
          >
            Réinitialiser
          </button>
        </div>

        <div className="audit-filters-grid">
          <div className="audit-search">
            <svg
              width="15"
              height="15"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#94a3b8"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            <input
              type="text"
              placeholder="Rechercher utilisateur, action, identifiant..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="audit-select"
            value={filtreAction}
            onChange={(e) => {
              setFiltreAction(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="TOUS">Toutes les actions</option>

            {actionsDisponibles.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <select
            className="audit-select"
            value={filtreEntite}
            onChange={(e) => {
              setFiltreEntite(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="TOUS">Toutes les entités</option>

            {entitesDisponibles.map((entite) => (
              <option key={entite} value={entite}>
                {entite}
              </option>
            ))}
          </select>

          <div className="audit-date-filter">
            <label>Date début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => {
                setDateDebut(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="audit-date-filter">
            <label>Date fin</label>
            <input
              type="date"
              value={dateFin}
              min={dateDebut || undefined}
              onChange={(e) => {
                setDateFin(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="audit-error">
          <p>{error}</p>

          <button
            type="button"
            className="audit-btn-primary"
            onClick={handleRefresh}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Tableau */}
      <div className="audit-table-section">
        <div className="audit-table-header">
          <h3>Historique des opérations</h3>
          <span>{total} résultat(s)</span>
        </div>

        {loading ? (
          <div className="audit-empty">
            Chargement des journaux…
          </div>
        ) : error ? (
          <div className="audit-empty">
            Les données ne sont pas disponibles.
          </div>
        ) : logs.length === 0 ? (
          <div className="audit-empty">
            Aucune opération trouvée.
          </div>
        ) : (
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Entité</th>
                  <th>Date</th>
                  <th>Adresse IP</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => {
                  const style = getActionConfig(log.action);

                  return (
                    <tr key={log.id}>
                      <td>
                        <div className="audit-user-name">
                          {log.userNom || "Utilisateur inconnu"}
                        </div>

                        <div className="audit-muted">
                          {log.userMatricule || "—"}
                        </div>
                      </td>

                      <td>
                        <span
                          className="audit-badge"
                          style={{
                            background: style.bg,
                            color: style.color,
                          }}
                        >
                          {style.label}
                        </span>
                      </td>

                      <td>
                        <div className="audit-entity-name">
                          {log.entity}
                        </div>

                        <div className="audit-muted">
                          {log.entityId || "—"}
                        </div>
                      </td>

                      <td className="audit-date">
                        {formatDate(log.createdAt)}
                      </td>

                      <td className="audit-muted">
                        {log.ipAddress || "—"}
                      </td>

                      <td>
                        <div className="audit-row-actions">
                          <button
                            type="button"
                            className="audit-action-btn"
                            onClick={() => setSelected(log)}
                          >
                            Détails
                          </button>

                          {log.entityId && (
                            <button
                              type="button"
                              className="audit-action-btn audit-action-history"
                              onClick={() => handleHistory(log)}
                            >
                              Historique
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && total > 0 && (
          <>
            <div className="audit-pagination">
              <button
                type="button"
                className="audit-page-btn"
                onClick={() =>
                  setCurrentPage((p) => Math.max(1, p - 1))
                }
                disabled={currentPage === 1}
              >
                ← Précédent
              </button>

              <span className="audit-page-current">
                Page {currentPage} sur {totalPages}
              </span>

              <button
                type="button"
                className="audit-page-btn"
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(totalPages, p + 1)
                  )
                }
                disabled={currentPage >= totalPages}
              >
                Suivant →
              </button>
            </div>

            <div className="audit-pagination-info">
              Affichage de {startIndex} à {endIndex} sur {total} opérations
            </div>
          </>
        )}
      </div>

      {/* Modal détail */}
      {selected && (
        <AuditDetailModal
          log={selected}
          onClose={() => setSelected(null)}
          onHistory={handleHistory}
        />
      )}

      {/* Modal historique */}
      {showHistory && (
        <AuditHistoryModal
          history={history}
          loading={historyLoading}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
