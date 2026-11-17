"use client";

import React, { useState } from "react";
import type { CreateCampagnePayload } from "../types";

interface Props {
  onClose: () => void;
  onSave: (data: CreateCampagnePayload) => Promise<void>;
}

export default function CampagneFormModal({ onClose, onSave }: Props) {
  const currentYear = new Date().getFullYear();
  const [annee, setAnnee] = useState(currentYear);
  const [dateOuverture, setDateOuverture] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dateCloture, setDateCloture] = useState(`${currentYear}-06-30`);
  const [description, setDescription] = useState(
    `Campagne de recensement annuel des biens de l'État — ${currentYear}`
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (dateCloture && new Date(dateCloture) > new Date(`${annee}-06-30`)) {
      setError(`La date de clôture ne peut pas dépasser le 30 juin ${annee} (limite réglementaire).`);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        annee: Number(annee),
        dateOuverture,
        dateCloture: dateCloture || undefined,
        description: description || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de la campagne");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="recensement-modal-overlay form" onClick={onClose}>
      <div className="recensement-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="recensement-form-header">
          <div>
            <h2>Lancer une nouvelle campagne</h2>
            <p>Recensement annuel des biens et logements administratifs</p>
          </div>
          <button className="recensement-form-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="recensement-form-body">
          {error && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          <div className="recensement-form-fields">
            <div className="recensement-form-row">
              <div>
                <label className="recensement-form-label">Année *</label>
                <input
                  type="number"
                  required
                  min={2000}
                  max={2100}
                  value={annee}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setAnnee(y);
                    setDateCloture(`${y}-06-30`);
                  }}
                  className="recensement-form-input"
                />
              </div>

              <div>
                <label className="recensement-form-label">Date d&apos;ouverture *</label>
                <input
                  type="date"
                  required
                  value={dateOuverture}
                  onChange={(e) => setDateOuverture(e.target.value)}
                  className="recensement-form-input"
                />
              </div>
            </div>

            <div>
              <label className="recensement-form-label">
                Date de clôture (limite réglementaire : 30 juin)
              </label>
              <input
                type="date"
                value={dateCloture}
                onChange={(e) => setDateCloture(e.target.value)}
                className="recensement-form-input"
              />
            </div>

            <div>
              <label className="recensement-form-label">Description ou note</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="recensement-form-textarea"
                placeholder="Précisions sur la campagne..."
              />
            </div>
          </div>

          <div className="recensement-form-actions">
            <button
              type="button"
              className="recensement-btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="recensement-btn-submit"
              disabled={saving}
            >
              {saving ? "Création en cours..." : "Ouvrir la campagne"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

