"use client";

import React from "react";
import type { User } from "./types";
import { roleConfig, providerLabel, formatDate } from "./constants";

interface UserDetailModalProps {
  user: User;
  onClose: () => void;
  onEdit: (u: User) => void;
  onDelete: (u: User) => void;
}

export default function UserDetailModal({
  user,
  onClose,
  onEdit,
  onDelete,
}: UserDetailModalProps) {
  const role = roleConfig[user.role];

  return (
    <div className="users-modal-overlay" onClick={onClose}>
      <div className="users-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="users-detail-header">
          <div>
            <h2>
              {user.prenom} {user.nom}
            </h2>
            <p>{user.email}</p>
          </div>
          <button className="users-detail-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="users-detail-body">
          <div className="users-detail-infos">
            <div className="users-info-row">
              <span className="users-info-label">Rôle</span>
              <span
                className="users-badge"
                style={{ background: role.bg, color: role.color }}
              >
                {role.label}
              </span>
            </div>
            <div className="users-info-row">
              <span className="users-info-label">Statut</span>
              <span
                className="users-badge"
                style={{
                  background: user.isActive ? "var(--green-bg)" : "var(--red-bg)",
                  color: user.isActive ? "var(--green)" : "var(--red)",
                }}
              >
                {user.isActive ? "Actif" : "Inactif"}
              </span>
            </div>
            <div className="users-info-row">
              <span className="users-info-label">Matricule</span>
              <span className="users-info-value">{user.matricule || "—"}</span>
            </div>
            <div className="users-info-row">
              <span className="users-info-label">Email</span>
              <span className="users-info-value">{user.email}</span>
            </div>
            <div className="users-info-row">
              <span className="users-info-label">Authentification</span>
              <span className="users-info-value">
                {providerLabel[user.provider]}
              </span>
            </div>
            <div className="users-info-row">
              <span className="users-info-label">Créé le</span>
              <span className="users-info-value">
                {formatDate(user.createdAt)}
              </span>
            </div>
          </div>

          <div className="users-detail-actions">
            <button className="users-btn-secondary" onClick={() => onEdit(user)}>
              ✎ Modifier
            </button>
            <button className="users-btn-danger" onClick={() => onDelete(user)}>
              🗑 Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}