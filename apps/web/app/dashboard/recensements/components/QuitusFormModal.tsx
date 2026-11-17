"use client";

import React, { useState, useEffect } from "react";
import type {
  CampagneRecensement,
  CreateQuitusPayload,
  EtatBatisse,
  BienSimple,
} from "../types";
import { recensementApi } from "../api";

interface Props {
  campagne: CampagneRecensement;
  onClose: () => void;
  onSave: (data: CreateQuitusPayload) => Promise<void>;
}

export default function QuitusFormModal({
  campagne,
  onClose,
  onSave,
}: Props) {
  const [bienNumero, setBienNumero] = useState("");
  const [etatBatiment, setEtatBatiment] = useState<EtatBatisse>("BON");
  const [observations, setObservations] = useState("");

  const [biensList, setBiensList] = useState<BienSimple[]>([]);
  const [loadingBiens, setLoadingBiens] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadBiens() {
      try {
        // Charger en priorité les biens sans quitus pour la campagne active
        const sansQuitus = await recensementApi.getBiensSansQuitus(campagne.id);
        if (isMounted && sansQuitus.length > 0 && sansQuitus[0]) {
          setBiensList(sansQuitus);
          setBienNumero(sansQuitus[0].numeroBien);
          setLoadingBiens(false);
          return;
        }

        // Sinon charger l'ensemble des biens
        const allBiens = await recensementApi.getAllBiens();
        if (isMounted) {
          setBiensList(allBiens);
          if (allBiens.length > 0 && allBiens[0]) {
            setBienNumero(allBiens[0].numeroBien);
          }
        }
      } catch (e) {
        console.error("Erreur chargement biens:", e);
      } finally {
        if (isMounted) setLoadingBiens(false);
      }
    }

    loadBiens();
    return () => {
      isMounted = false;
    };
  }, [campagne.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bienNumero.trim()) {
      setError("Veuillez sélectionner ou saisir un bien.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({
        campagneId: campagne.id,
        bienNumero: bienNumero.trim(),
        etatBatiment,
        observations: observations.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du quitus");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="recensement-modal-overlay form" onClick={onClose}>
      <div className="recensement-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="recensement-form-header">
          <div>
            <h2>Nouveau Quitus de Recensement</h2>
            <p>Campagne annuelle {campagne.annee}</p>
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
            {/* Campagne info */}
            <div
              style={{
                padding: "10px 14px",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "var(--muted)" }}>Campagne rattachée</span>
              <strong style={{ color: "var(--text)" }}>Année {campagne.annee}</strong>
            </div>

            {/* Bien selection */}
            <div>
              <label className="recensement-form-label">Bien à recenser *</label>
              {loadingBiens ? (
                <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>
                  Chargement des biens de la région...
                </div>
              ) : biensList.length > 0 ? (
                <select
                  required
                  value={bienNumero}
                  onChange={(e) => setBienNumero(e.target.value)}
                  className="recensement-form-input"
                >
                  {biensList.map((b) => (
                    <option key={b.numeroBien} value={b.numeroBien}>
                      {b.nomDuBien} — ({b.numeroBien}) {b.adresse ? `· ${b.adresse}` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="Ex: INV-2024-0012"
                  value={bienNumero}
                  onChange={(e) => setBienNumero(e.target.value)}
                  className="recensement-form-input"
                />
              )}
              <span style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4, display: "block" }}>
                L&apos;état d&apos;occupation et l&apos;occupant actuel seront automatiquement enregistrés dans le snapshot.
              </span>
            </div>

            {/* État du bâtiment */}
            <div>
              <label className="recensement-form-label">État de la bâtisse constaté</label>
              <select
                value={etatBatiment}
                onChange={(e) => setEtatBatiment(e.target.value as EtatBatisse)}
                className="recensement-form-input"
              >
                <option value="BON">Bon — Aucun défaut majeur</option>
                <option value="MOYEN">Moyen — Entretien ou réparations mineures</option>
                <option value="MAUVAIS">Mauvais — Vétuste ou réparations majeures requises</option>
              </select>
            </div>

            {/* Observations */}
            <div>
              <label className="recensement-form-label">Constats et observations</label>
              <textarea
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="recensement-form-textarea"
                placeholder="Remarques relatives à la conformité de l'occupation, état des lieux..."
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
              {saving ? "Enregistrement..." : "Créer le quitus"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
