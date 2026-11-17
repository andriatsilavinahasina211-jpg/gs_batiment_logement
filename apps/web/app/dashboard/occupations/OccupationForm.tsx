"use client";

import React, { useState, useMemo, useEffect } from "react";
import type { Occupation, BienOption, OccupantOption } from "./types";
import { statutConfig } from "./constants";
import { biensApi, occupantsApi } from "./api";
import { SearchableSelect } from "./SearchableSelect";
import { useFeedback } from "../shared/feedback";

/** Ajoute N mois à une date YYYY-MM-DD */
function addMonthsToDate(dateStr: string, months: number): string {
  if (!dateStr || !months || months <= 0) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function OccupationForm({
  mode,
  occupation,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  occupation?: Occupation;
  onClose: () => void;
  onSave: (data: Occupation) => void | Promise<void>;
}) {
  const { toast } = useFeedback();
  const emptyForm: Occupation = {
    numeroOccupation: "",
    dateEntree: "",
    dateSortiePrevue: "",
    dateSortieReelle: "",
    statut: "EN_ATTENTE",
    motifLiberation: "",
    clesRestituees: false,
    procedureJudiciaire: false,
    delaiJouissanceMois: undefined,
    bienNumero: "",
    bienNom: "",
    occupantId: undefined,
    occupantNom: "",
    demandeReference: "",
  };

  const [form, setForm] = useState<Occupation>(
    mode === "edit" && occupation ? { ...occupation } : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [biens, setBiens] = useState<BienOption[]>([]);
  const [occupants, setOccupants] = useState<OccupantOption[]>([]);
  const [loadingBiens, setLoadingBiens] = useState(true);
  const [loadingOccupants, setLoadingOccupants] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBiens(true);
      setLoadingOccupants(true);
      try {
        const [biensList, occupantsList] = await Promise.all([
          biensApi.getAll(),
          occupantsApi.getAll().catch(() => [] as OccupantOption[]),
        ]);
        if (!cancelled) {
          setBiens(biensList);
          setOccupants(occupantsList);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) {
          setLoadingBiens(false);
          setLoadingOccupants(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const biensSelectOptions = useMemo(() => {
    let list = biens;
    if (mode === "create") {
      list = biens.filter((b) => b.statut === "LIBRE");
    } else if (
      form.bienNumero &&
      !list.some((b) => b.numeroBien === form.bienNumero)
    ) {
      list = [
        {
          numeroBien: form.bienNumero,
          nomDuBien: form.bienNom || form.bienNumero,
          statut: "OCCUPE",
        },
        ...list,
      ];
    }
    return list.map((b) => ({
      id: b.numeroBien,
      label: `${b.numeroBien} — ${b.nomDuBien}${
        b.localite ? ` (${b.localite})` : ""
      }`,
      searchText: `${b.numeroBien} ${b.nomDuBien} ${b.localite || ""}`,
    }));
  }, [biens, mode, form.bienNumero, form.bienNom]);

  const occupantsSelectOptions = useMemo(() => {
    return occupants.map((o) => ({
      id: String(o.occupanId),
      label: `${o.prenom} ${o.nom}${
        o.matricule ? ` (${o.matricule})` : ""
      }${o.ministere ? ` — ${o.ministere}` : ""}`,
      searchText: `${o.prenom} ${o.nom} ${o.matricule || ""} ${
        o.ministere || ""
      } ${o.occupanId}`,
    }));
  }, [occupants]);

  const bienDisplay =
    form.bienNumero && form.bienNom
      ? `${form.bienNumero} — ${form.bienNom}`
      : form.bienNumero || "";

  const occupantDisplay =
    form.occupantNom ||
    (form.occupantId
      ? occupantsSelectOptions.find((o) => o.id === String(form.occupantId))
          ?.label || `ID ${form.occupantId}`
      : "");

  /** Met à jour un champ et recalcule les dates de sortie si besoin */
  const handleChange = (
    field: keyof Occupation,
    value: string | boolean | number
  ) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Recalcul si date d'entrée ou délai change
      if (field === "dateEntree" || field === "delaiJouissanceMois") {
        const dateEntree =
          field === "dateEntree" ? String(value) : next.dateEntree;
        const delai =
          field === "delaiJouissanceMois"
            ? Number(value) || 0
            : next.delaiJouissanceMois || 0;

        if (dateEntree && delai > 0) {
          const sortie = addMonthsToDate(dateEntree, delai);
          next.dateSortiePrevue = sortie;
          next.dateSortieReelle = sortie;
        } else if (field === "dateEntree" && !dateEntree) {
          next.dateSortiePrevue = "";
          next.dateSortieReelle = "";
        }
      }

      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dateEntree || !form.bienNumero.trim()) {
      toast.warning(
        "Informations manquantes",
        "La date d'entrée et le bien sont obligatoires."
      );
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="occupations-modal-overlay form" onClick={onClose}>
      <div
        className="occupations-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="occupations-form-header">
          <div>
            <h2>
              {mode === "create"
                ? "Nouvelle occupation"
                : "Modifier l'occupation"}
            </h2>
            {mode === "edit" && <p>{occupation?.numeroOccupation}</p>}
          </div>
          <button className="occupations-form-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="occupations-form-body">
          <div className="occupations-form-fields">
            <div className="occupations-form-row">
              <SearchableSelect
                label="Bien"
                required
                disabled={mode === "edit"}
                loading={loadingBiens}
                placeholder="Rechercher un bien (n°, nom, localité)…"
                value={form.bienNumero}
                displayValue={bienDisplay}
                options={biensSelectOptions}
                emptyMessage={
                  mode === "create"
                    ? "Aucun bien libre trouvé"
                    : "Aucun bien trouvé"
                }
                onSelect={(id) => {
                  const b = biens.find((x) => x.numeroBien === id);
                  setForm((prev) => ({
                    ...prev,
                    bienNumero: id,
                    bienNom: b?.nomDuBien || "",
                  }));
                }}
                onClear={() =>
                  setForm((prev) => ({
                    ...prev,
                    bienNumero: "",
                    bienNom: "",
                  }))
                }
              />

              <SearchableSelect
                label="Occupant"
                loading={loadingOccupants}
                placeholder="Rechercher un occupant (nom, matricule)…"
                value={form.occupantId ? String(form.occupantId) : ""}
                displayValue={occupantDisplay}
                options={occupantsSelectOptions}
                emptyMessage="Aucun occupant trouvé"
                onSelect={(id) => {
                  const occ = occupants.find(
                    (x) => String(x.occupanId) === id
                  );
                  setForm((prev) => ({
                    ...prev,
                    occupantId: Number(id),
                    occupantNom: occ
                      ? `${occ.prenom} ${occ.nom}`
                      : prev.occupantNom,
                  }));
                }}
                onClear={() =>
                  setForm((prev) => ({
                    ...prev,
                    occupantId: undefined,
                    occupantNom: "",
                  }))
                }
              />
            </div>

            <div className="occupations-form-row">
              <div>
                <label className="occupations-form-label">
                  Délai jouissance (mois) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.delaiJouissanceMois ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "delaiJouissanceMois",
                      e.target.value ? Number(e.target.value) : 0
                    )
                  }
                  className="occupations-form-input"
                  placeholder="Ex: 12"
                />
              </div>
              <div>
                <label className="occupations-form-label">
                  Date d&apos;entrée *
                </label>
                <input
                  type="date"
                  required
                  value={form.dateEntree}
                  onChange={(e) => handleChange("dateEntree", e.target.value)}
                  className="occupations-form-input"
                />
              </div>
              <div>
                <label className="occupations-form-label">
                  Date sortie prévue
                </label>
                <input
                  type="date"
                  value={form.dateSortiePrevue || ""}
                  onChange={(e) =>
                    handleChange("dateSortiePrevue", e.target.value)
                  }
                  className="occupations-form-input"
                  title="Calculée automatiquement (modifiable)"
                />
              </div>
              <div>
                <label className="occupations-form-label">
                  Date sortie réelle
                </label>
                <input
                  type="date"
                  value={form.dateSortieReelle || ""}
                  onChange={(e) =>
                    handleChange("dateSortieReelle", e.target.value)
                  }
                  className="occupations-form-input"
                  title="Calculée automatiquement (modifiable)"
                />
              </div>
            </div>

            <div>
              <label className="occupations-form-label">Statut *</label>
              <select
                required
                value={form.statut}
                onChange={(e) => handleChange("statut", e.target.value)}
                className="occupations-form-input"
              >
                {Object.entries(statutConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="occupations-form-label">
                Motif de libération
              </label>
              <input
                type="text"
                value={form.motifLiberation || ""}
                onChange={(e) =>
                  handleChange("motifLiberation", e.target.value)
                }
                className="occupations-form-input"
                placeholder="Ex: Mutation, retraite..."
              />
            </div>

            <div className="occupations-form-row">
              <label className="occupations-checkbox-row">
                <input
                  type="checkbox"
                  checked={form.clesRestituees}
                  onChange={(e) =>
                    handleChange("clesRestituees", e.target.checked)
                  }
                />
                Clés restituées
              </label>
              <label className="occupations-checkbox-row">
                <input
                  type="checkbox"
                  checked={form.procedureJudiciaire}
                  onChange={(e) =>
                    handleChange("procedureJudiciaire", e.target.checked)
                  }
                />
                Procédure judiciaire
              </label>
            </div>
          </div>

          <div className="occupations-form-actions">
            <button
              type="button"
              className="occupations-btn-cancel"
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="occupations-btn-submit"
              disabled={saving || loadingBiens}
            >
              {saving
                ? "Enregistrement..."
                : mode === "create"
                ? "Créer l'occupation"
                : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}