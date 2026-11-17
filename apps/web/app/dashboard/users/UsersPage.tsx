"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./UsersPage.css";

import type { User } from "./types";
import {
  roleConfig,
  providerLabel,
  ITEMS_PER_PAGE,
  initials,
} from "./constants";
import { usersApi } from "./api";
import UserForm from "./UserForm";
import UserDetailModal from "./UserDetailModal";
import { useFeedback } from "../shared/feedback";

export default function UtilisateursPage() {
  const { toast, confirmAction } = useFeedback();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtreRole, setFiltreRole] = useState("TOUS");
  const [filtreActif, setFiltreActif] = useState("TOUS");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.getAll();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les utilisateurs");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search.trim() ||
        u.nom.toLowerCase().includes(q) ||
        u.prenom.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.matricule || "").toLowerCase().includes(q);

      const matchRole = filtreRole === "TOUS" || u.role === filtreRole;
      const matchActif =
        filtreActif === "TOUS" ||
        (filtreActif === "OUI" && u.isActive) ||
        (filtreActif === "NON" && !u.isActive);

      return matchSearch && matchRole && matchActif;
    });
  }, [users, search, filtreRole, filtreActif]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const current = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const handleEdit = (u: User) => {
    setSelected(null);
    setEditing(u);
  };

  const handleSaveEdit = (updated: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setEditing(null);
    setSelected(updated);
    toast.success(
      "Utilisateur modifié",
      `Les informations de ${updated.prenom} ${updated.nom} ont été mises à jour avec succès.`
    );
  };

  const handleCreate = (newUser: User) => {
    setUsers((prev) => [newUser, ...prev]);
    setShowCreate(false);
    setCurrentPage(1);
    toast.success(
      "Utilisateur créé",
      `Le compte de ${newUser.prenom} ${newUser.nom} a été créé avec succès.`
    );
  };

  const handleDelete = async (u: User) => {
    if (
      !(await confirmAction({
        title: "Confirmer la suppression",
        message: `Vous êtes sur le point de supprimer définitivement l'utilisateur « ${u.prenom} ${u.nom} ». Cette action est irréversible.`,
        confirmLabel: "Supprimer",
        type: "warning",
      }))
    ) {
      return;
    }

    try {
      await usersApi.remove(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setSelected(null);
      toast.success(
        "Utilisateur supprimé",
        `L'utilisateur ${u.prenom} ${u.nom} a été supprimé avec succès.`
      );
    } catch (err: any) {
      toast.error(
        "Échec de la suppression",
        err.message || "Une erreur est survenue lors de la suppression de l'utilisateur."
      );
    }
  };

  return (
    <div className="users-page">
      <div className="users-header">
        <div>
          <h2>Gestion des utilisateurs</h2>
          <p>
            {loading
              ? "Chargement..."
              : `${filtered.length} utilisateur${filtered.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          className="users-btn-primary"
          onClick={() => setShowCreate(true)}
          disabled={loading}
        >
          + Nouvel utilisateur
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            onClick={loadUsers}
            style={{
              background: "transparent",
              border: "1px solid #b91c1c",
              color: "#b91c1c",
              padding: "4px 12px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      <div className="users-filters">
        <div className="users-search">
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
            placeholder="Rechercher par nom, email, matricule..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <select
          className="users-select"
          value={filtreRole}
          onChange={(e) => {
            setFiltreRole(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="TOUS">Tous les rôles</option>
          {Object.entries(roleConfig).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="users-select"
          value={filtreActif}
          onChange={(e) => {
            setFiltreActif(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="TOUS">Tous les statuts</option>
          <option value="OUI">Actifs</option>
          <option value="NON">Inactifs</option>
        </select>
      </div>

      {loading ? (
        <div className="users-empty">Chargement des utilisateurs...</div>
      ) : current.length === 0 ? (
        <div className="users-empty">
          Aucun utilisateur ne correspond à votre recherche.
        </div>
      ) : (
        <>
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Matricule</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Auth</th>
                  <th>Statut</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {current.map((u) => {
                  const role = roleConfig[u.role];
                  return (
                    <tr key={u.id} onClick={() => setSelected(u)}>
                      <td>
                        <div className="users-identity">
                          <div className="users-avatar">
                            {initials(u.prenom, u.nom)}
                          </div>
                          <span className="users-td-strong">
                            {u.prenom} {u.nom}
                          </span>
                        </div>
                      </td>
                      <td className="users-td-muted">{u.matricule || "—"}</td>
                      <td>{u.email}</td>
                      <td>
                        <span
                          className="users-badge"
                          style={{ background: role.bg, color: role.color }}
                        >
                          {role.label}
                        </span>
                      </td>
                      <td className="users-td-muted">
                        {providerLabel[u.provider]}
                      </td>
                      <td>
                        <span
                          className="users-badge"
                          style={{
                            background: u.isActive
                              ? "var(--green-bg)"
                              : "var(--red-bg)",
                            color: u.isActive ? "var(--green)" : "var(--red)",
                          }}
                        >
                          {u.isActive ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td>
                        <div
                          className="users-td-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="users-btn-icon"
                            title="Modifier"
                            onClick={() => handleEdit(u)}
                          >
                            ✎
                          </button>
                          <button
                            className="users-btn-icon danger"
                            title="Supprimer"
                            onClick={() => handleDelete(u)}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="users-pagination">
              <button
                className="users-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`users-page-num${p === currentPage ? " active" : ""}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="users-page-btn"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Suivant →
              </button>
            </div>
          )}

          <div className="users-pagination-info">
            Page {currentPage} sur {totalPages} — Affichage de{" "}
            {filtered.length === 0 ? 0 : startIndex + 1} à{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} sur{" "}
            {filtered.length}
          </div>
        </>
      )}

      {selected && (
        <UserDetailModal
          user={selected}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {editing && (
        <UserForm
          mode="edit"
          user={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
        />
      )}

      {showCreate && (
        <UserForm
          mode="create"
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}