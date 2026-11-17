"use client";

import React, { useState } from "react";
import type { Occupation } from "./types";
import { occupationsApi } from "./api";
import { useFeedback } from "../shared/feedback";

interface LiberationFormProps {
    occupation: Occupation;
    mode: "demander" | "valider";
    onClose: () => void;
    onSuccess?: () => void;
}

export function LiberationForm({
    occupation,
    mode,
    onClose,
    onSuccess,
}: LiberationFormProps) {
    const { toast } = useFeedback();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Champs pour "demander"
    const [motif, setMotif] = useState("");
    const [dateSouhaitee, setDateSouhaitee] = useState(
        occupation.dateSortiePrevue || new Date().toISOString().slice(0, 10)
    );

    // Champs pour "valider"
    const [dateReelle, setDateReelle] = useState(
        new Date().toISOString().slice(0, 10)
    );
    const [clesRestituees, setClesRestituees] = useState(true);
    const [observations, setObservations] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === "demander") {
                if (!motif.trim()) {
                    toast.warning(
                        "Motif obligatoire",
                        "Veuillez renseigner le motif de libération."
                    );
                    return;
                }
                await occupationsApi.demanderLiberation(occupation.numeroOccupation, {
                    motifLiberation: motif.trim(),
                    dateSortieSouhaitee: dateSouhaitee || undefined,
                });
            } else {
                await occupationsApi.validerLiberation(occupation.numeroOccupation, {
                    dateSortieReelle: dateReelle,
                    clesRestituees,
                    observations: observations.trim() || undefined,
                });
            }
            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err.message || "Erreur lors de l'opération");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="occupations-modal-overlay form" onClick={onClose}>
            <div
                className="occupations-form-modal"
                style={{ maxWidth: 520 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="occupations-form-header">
                    <div>
                        <h2>
                            {mode === "demander"
                                ? "Demande de libération"
                                : "Validation de la libération"}
                        </h2>
                        <p>
                            {occupation.numeroOccupation}
                            {occupation.occupantNom ? ` · ${occupation.occupantNom}` : ""}
                        </p>
                    </div>
                    <button className="occupations-form-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="occupations-form-body">
                    <div className="occupations-form-fields">
                        {mode === "demander" ? (
                            <>
                                <div>
                                    <label className="occupations-form-label">
                                        Motif de libération *
                                    </label>
                                    <textarea
                                        className="occupations-form-input"
                                        rows={3}
                                        value={motif}
                                        onChange={(e) => setMotif(e.target.value)}
                                        placeholder="Ex: Mutation, retraite, fin de mission…"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="occupations-form-label">
                                        Date de sortie souhaitée
                                    </label>
                                    <input
                                        type="date"
                                        className="occupations-form-input"
                                        value={dateSouhaitee}
                                        onChange={(e) => setDateSouhaitee(e.target.value)}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="occupations-form-label">
                                        Date de sortie réelle *
                                    </label>
                                    <input
                                        type="date"
                                        className="occupations-form-input"
                                        value={dateReelle}
                                        onChange={(e) => setDateReelle(e.target.value)}
                                        required
                                    />
                                </div>
                                <label className="occupations-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={clesRestituees}
                                        onChange={(e) => setClesRestituees(e.target.checked)}
                                    />
                                    Clés restituées
                                </label>
                                <div>
                                    <label className="occupations-form-label">
                                        Observations
                                    </label>
                                    <textarea
                                        className="occupations-form-input"
                                        rows={2}
                                        value={observations}
                                        onChange={(e) => setObservations(e.target.value)}
                                        placeholder="Remarques éventuelles…"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {error && (
                        <p style={{ color: "#dc2626", fontWeight: 600, marginTop: 12 }}>
                            {error}
                        </p>
                    )}

                    <div className="occupations-form-actions">
                        <button
                            type="button"
                            className="occupations-btn-cancel"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="occupations-btn-submit"
                            disabled={loading}
                        >
                            {loading
                                ? "Traitement…"
                                : mode === "demander"
                                    ? "Envoyer la demande"
                                    : "Valider la libération"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}