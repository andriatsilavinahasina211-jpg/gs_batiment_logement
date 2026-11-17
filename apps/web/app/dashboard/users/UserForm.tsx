"use client";

import React, { useState } from "react";
import type { User, UserFormData, Role } from "./types";
import { roleConfig } from "./constants";
import { usersApi } from "./api";

interface UserFormProps {
  mode: "create" | "edit";
  user?: User;
  onClose: () => void;
  onSave: (data: User) => void;
}

export default function UserForm({ mode, user, onClose, onSave }: UserFormProps) {
  const empty: UserFormData = {
    id: 0,
    matricule: "",
    nom: "",
    prenom: "",
    email: "",
    role: "AGENT",
    isActive: true,
    provider: "EMAIL",
    password: "",
  };

  const [form, setForm] = useState<UserFormData>(
    mode === "edit" && user
      ? {
          id: user.id,
          matricule: user.matricule || "",
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          provider: user.provider,
          password: "",
        }
      : empty
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof UserFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nom.trim() || !form.prenom.trim() || !form.email.trim()) {
      setError("Nom, prénom et email sont obligatoires.");
      return;
    }
    if (mode === "create" && form.provider === "EMAIL" && !form.password.trim()) {
      setError("Le mot de passe est obligatoire pour un compte Email.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim(),
        role: form.role,
        isActive: form.isActive,
        provider: form.provider,
        matricule: form.matricule?.trim() || null,
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      let saved: User;
      if (mode === "create") {
        saved = await usersApi.create(payload);
      } else {
        const { provider, ...updatePayload } = payload;
        saved = await usersApi.update(form.id, updatePayload);
      }

      onSave(saved);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="users-modal-overlay form" onClick={onClose}>
      <div className="users-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="users-form-header">
          <h2>
            {mode === "create" ? "Nouvel utilisateur" : "Modifier l'utilisateur"}
          </h2>
          <button className="users-form-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="users-form-body">
          {error && (
            <div
              style={{
                background: "#fef2f2",
                color: "#b91c1c",
                padding: "10px 14px",
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <div className="users-form-fields">
            <div className="users-form-row">
              <div>
                <label className="users-form-label">Prénom *</label>
                <input
                  type="text"
                  required
                  value={form.prenom}
                  onChange={(e) => set("prenom", e.target.value)}
                  className="users-form-input"
                />
              </div>
              <div>
                <label className="users-form-label">Nom *</label>
                <input
                  type="text"
                  required
                  value={form.nom}
                  onChange={(e) => set("nom", e.target.value)}
                  className="users-form-input"
                />
              </div>
            </div>

            <div>
              <label className="users-form-label">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="users-form-input"
                disabled={mode === "edit"}
              />
            </div>

            <div className="users-form-row">
              <div>
                <label className="users-form-label">Matricule</label>
                <input
                  type="text"
                  value={form.matricule}
                  onChange={(e) => set("matricule", e.target.value)}
                  className="users-form-input"
                  placeholder="Ex: 123.456"
                />
              </div>
              <div>
                <label className="users-form-label">Rôle *</label>
                <select
                  required
                  value={form.role}
                  onChange={(e) => set("role", e.target.value as Role)}
                  className="users-form-input"
                >
                  {Object.entries(roleConfig)
                    .filter(([key]) => key !== "ADMINISTRATEUR")
                    .map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="users-form-row">
              <div>
                <label className="users-form-label">Fournisseur auth</label>
                <select
                  value={form.provider}
                  onChange={(e) => set("provider", e.target.value)}
                  className="users-form-input"
                  disabled={mode === "edit"}
                >
                  <option value="EMAIL">Email</option>
                  <option value="GOOGLE">Google</option>
                </select>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  paddingBottom: 8,
                }}
              >
                <label className="users-checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => set("isActive", e.target.checked)}
                  />
                  Compte actif
                </label>
              </div>
            </div>

            {(mode === "create" || form.provider === "EMAIL") && (
              <div>
                <label className="users-form-label">
                  Mot de passe{" "}
                  {mode === "create" && form.provider === "EMAIL"
                    ? "*"
                    : "(laisser vide pour ne pas changer)"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className="users-form-input"
                  placeholder={
                    mode === "edit" ? "••••••••" : "Min. 8 caractères"
                  }
                  autoComplete="new-password"
                />
              </div>
            )}
          </div>

          <div className="users-form-actions">
            <button type="button" className="users-btn-cancel" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="users-btn-submit" disabled={saving}>
              {saving
                ? "Enregistrement..."
                : mode === "create"
                  ? "Créer l'utilisateur"
                  : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}