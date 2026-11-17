"use client";

import React, { useState, useEffect, useMemo } from "react";
import type {
  Occupation,
  BienOption,
  EtatDesLieuxPayload,
  TypeEtatDesLieux,
  PieceEtatDesLieux,
} from "./types";
import { formatDate } from "./constants";
import { biensApi, occupationsApi } from "./api";
import { SearchableSelect } from "./SearchableSelect";
import { useFeedback } from "../shared/feedback";

interface EtatDesLieuxFormProps {
  occupation: Occupation;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PieceRow {
  id: string;
  designation: string;
  etat: number;
  caracteristiques: string;
}

const ETAT_OPTIONS = [
  { value: 1, label: "1 – Bon" },
  { value: 2, label: "2 – Moyen" },
  { value: 3, label: "3 – Nécessite entretien" },
];

/** Suggestions de désignations (optionnel) */
const SUGGESTIONS_DESIGNATION = [
  "Salle N°01 (Séjour)",
  "Salle N°02 (Chambre)",
  "Salle N°03 (Chambre)",
  "Salle N°04 (Chambre)",
  "Salle N°05 (Cuisine)",
  "Salle N°06 (Douche et WC)",
  "Entrée / Dégagement",
  "Couloir",
  "Balcon / Terrasse",
  "A l'extérieur",
  "Toiture en tôle",
  "Garage",
  "Cave",
];

function newPieceId() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyPiece(index: number): PieceRow {
  return {
    id: newPieceId(),
    designation: `Salle N°${String(index).padStart(2, "0")}`,
    etat: 1,
    caracteristiques: "",
  };
}

export function EtatDesLieuxForm({
  occupation,
  onClose,
  onSuccess,
}: EtatDesLieuxFormProps) {
  const { toast } = useFeedback();
  const [biens, setBiens] = useState<BienOption[]>([]);
  const [loadingBiens, setLoadingBiens] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<TypeEtatDesLieux>("ENTREE");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lieu, setLieu] = useState("Fianarantsoa");
  const [descriptionBien, setDescriptionBien] = useState(() => {
    const parts: string[] = [];
    if (occupation.bienNom) parts.push(occupation.bienNom);
    if (occupation.bienNumero) parts.push(`Bien n° ${occupation.bienNumero}`);
    return parts.join(" – ");
  });
  const [bienNumero, setBienNumero] = useState(occupation.bienNumero || "");
  const [bienNom, setBienNom] = useState(occupation.bienNom || "");
  const [observationsGenerales, setObservationsGenerales] = useState("");
  const [signataireBailleur, setSignataireBailleur] = useState("");
  const [signataireAdministration, setSignataireAdministration] =
    useState("");

  // Liste dynamique des pièces (1 à N)
  const [pieces, setPieces] = useState<PieceRow[]>([
    createEmptyPiece(1),
    createEmptyPiece(2),
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBiens(true);
      try {
        const list = await biensApi.getAll();
        if (!cancelled) setBiens(list);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingBiens(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const biensSelectOptions = useMemo(() => {
    let list = biens;
    if (
      occupation.bienNumero &&
      !list.some((b) => b.numeroBien === occupation.bienNumero)
    ) {
      list = [
        {
          numeroBien: occupation.bienNumero,
          nomDuBien: occupation.bienNom || occupation.bienNumero,
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
  }, [biens, occupation.bienNumero, occupation.bienNom]);

  const bienDisplay =
    bienNumero && bienNom
      ? `${bienNumero} — ${bienNom}`
      : bienNumero || "";

  const updatePiece = (
    id: string,
    field: "designation" | "etat" | "caracteristiques",
    value: string | number
  ) => {
    setPieces((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]: value,
            }
          : p
      )
    );
  };

  const addPiece = () => {
    setPieces((prev) => [...prev, createEmptyPiece(prev.length + 1)]);
  };

  const handleFillOfficialExample = () => {
    setDescriptionBien(
      "Un appartement situé au 1er étage, composé de trois (03) chambres et un (01) séjour, sis à Fianarantsoa qui devraient servir le logement du Chef du Service Régional de la Solde et des Pensions Haute Matsiatra."
    );
    setLieu("Fianarantsoa");
    setSignataireBailleur("Le Bailleur");
    setSignataireAdministration("L'Administration");
    setObservationsGenerales("");
    setPieces([
      {
        id: newPieceId(),
        designation: "Salle N° 01 (Séjour)",
        etat: 1,
        caracteristiques: [
          "Une porte principale en bois pleine à deux vantaux",
          "Une porte en bois pleine à 2 vantaux",
          "Une fenêtre en bois pleine à 2 vantaux",
          "Parquet en bois",
          "Plafond en bois",
          "Enduits ciments",
          "Peinture à l'eau sur les murs intérieurs",
          "Une lampe sur le plafond",
          "Une prise et deux interrupteurs",
          "Installation électrique en apparence",
        ].join("\n"),
      },
      {
        id: newPieceId(),
        designation: "Salle N° 02 (Chambre)",
        etat: 1,
        caracteristiques: [
          "Une porte de communication en bois",
          "Une fenêtre en bois pleine à 2 vantaux",
          "Une porte en bois pleine à 2 vantaux",
          "Parquet en bois",
          "Plafond en bois",
          "Enduits ciments",
          "Peinture à l'eau sur les murs intérieurs",
          "Une lampe sur le plafond",
          "Une prise et un interrupteur",
          "Installation électrique en apparence",
        ].join("\n"),
      },
      {
        id: newPieceId(),
        designation: "Salle N° 03 (Chambre)",
        etat: 1,
        caracteristiques: [
          "Une porte de communication en bois pleine",
          "Une fenêtre en bois à 2 vantaux",
          "Une porte en bois pleine à 2 vantaux",
          "Parquet en ciment",
          "Plafond en bois",
          "Enduits ciments",
          "Peinture à l'eau sur les murs intérieurs",
          "Une lampe sur le plafond",
          "Une prise et un interrupteur",
          "Installation électrique en apparence",
        ].join("\n"),
      },
      {
        id: newPieceId(),
        designation: "Salle N° 04 (Chambre)",
        etat: 1,
        caracteristiques: [
          "Une porte de communication en bois",
          "Une fenêtre en bois à 2 vantaux",
          "Parquet en bois",
          "Plafond en bois",
          "Enduits ciments",
          "Peinture à l'eau sur les murs intérieurs",
          "Une lampe sur le plafond",
          "Une prise et un interrupteur",
          "Installation électrique en apparence",
        ].join("\n"),
      },
      {
        id: newPieceId(),
        designation: "Salle N° 05 (Cuisine)",
        etat: 2,
        caracteristiques: [
          "Parquet en bois",
          "Plafond en bois",
          "Table en carrelage pour lave-vaisselle",
          "Une lampe sur le plafond",
          "Un interrupteur",
          "Installation électrique en apparence",
        ].join("\n"),
      },
      {
        id: newPieceId(),
        designation: "Salle N° 06 (Douche et WC)",
        etat: 2,
        caracteristiques: [
          "Parquet en carrelage",
          "Plafond en bois",
          "Une lave main (moyen état)",
          "WC à l'Anglaise (mauvais état)",
          "Mur intérieur en ciment",
          "Une lampe sur le plafond",
          "Un interrupteur",
          "Installation électrique en apparence",
        ].join("\n"),
      },
      {
        id: newPieceId(),
        designation: "A l'extérieur",
        etat: 2,
        caracteristiques: "Clôture",
      },
      {
        id: newPieceId(),
        designation: "Toiture en tôle",
        etat: 2,
        caracteristiques: "Rien à signaler",
      },
    ]);
  };

  const removePiece = (id: string) => {
    setPieces((prev) => {
      if (prev.length <= 1) {
        setError("Au moins une pièce est obligatoire.");
        return prev;
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) {
      setError("La date de l'état des lieux est obligatoire.");
      return;
    }
    if (!lieu.trim()) {
      setError("Le lieu est obligatoire.");
      return;
    }
    if (!signataireBailleur.trim()) {
      setError("Le signataire bailleur est obligatoire.");
      return;
    }
    if (!signataireAdministration.trim()) {
      setError("Le signataire administration est obligatoire.");
      return;
    }

    const emptyDesignation = pieces.some((p) => !p.designation.trim());
    if (emptyDesignation) {
      setError("Chaque pièce doit avoir une désignation.");
      return;
    }

    const piecesPayload: PieceEtatDesLieux[] = pieces.map((p) => {
      // Séparation ligne par ligne (ou virgule si tout sur une seule ligne)
      const rawText = p.caracteristiques || "";
      const lines = rawText.includes("\n")
        ? rawText.split(/\r?\n+/)
        : rawText.split(/[,;]+/);

      const caracs = lines
        .map((s) => s.trim().replace(/^[-•*]\s*/, ""))
        .filter(Boolean);

      return {
        designation: p.designation.trim(),
        etat: p.etat,
        caracteristiques: caracs.length > 0 ? caracs : ["—"],
      };
    });

    if (piecesPayload.length === 0) {
      setError("Au moins une pièce est requise.");
      return;
    }

    setGenerating(true);
    setError(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    const payload: EtatDesLieuxPayload = {
      numeroOccupation: occupation.numeroOccupation,
      type,
      date,
      lieu: lieu.trim(),
      descriptionBien:
        descriptionBien.trim() ||
        `Occupation n° ${occupation.numeroOccupation}` +
          (bienNumero ? ` — Bien ${bienNumero}` : ""),
      pieces: piecesPayload,
      observationsGenerales: observationsGenerales.trim() || undefined,
      signataireBailleur: signataireBailleur.trim(),
      signataireAdministration: signataireAdministration.trim(),
    };

    try {
      const url = await occupationsApi.generateEtatDesLieux(
        occupation.numeroOccupation,
        payload
      );
      setPdfUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.message || "Erreur lors de la génération du PDF";
      setError(msg);
      toast.error("Échec de la génération", msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `etat-des-lieux-${occupation.numeroOccupation}-${type.toLowerCase()}.pdf`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="occupations-modal-overlay form" onClick={onClose}>
      <div
        className="occupations-form-modal"
        style={{ maxWidth: 760 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="occupations-form-header">
          <div>
            <h2>📄 État des lieux</h2>
            <p>
              {occupation.numeroOccupation}
              {occupation.occupantNom ? ` · ${occupation.occupantNom}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={handleFillOfficialExample}
              style={{
                background: "#f0fdf4",
                border: "1px solid #16a34a",
                color: "#166534",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Pré-remplit toutes les salles et informations selon le document officiel"
            >
              📋 Remplir selon le modèle officiel
            </button>
            <button className="occupations-form-close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="occupations-form-body">
          <div className="occupations-form-fields">
            <div className="occupations-form-row">
              <div>
                <label className="occupations-form-label">
                  Type d&apos;état des lieux *
                </label>
                <select
                  className="occupations-form-input"
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as TypeEtatDesLieux)
                  }
                  required
                >
                  <option value="ENTREE">État des lieux d&apos;entrée</option>
                  <option value="SORTIE">État des lieux de sortie</option>
                </select>
              </div>
              <div>
                <label className="occupations-form-label">Date *</label>
                <input
                  type="date"
                  className="occupations-form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="occupations-form-row">
              <div>
                <label className="occupations-form-label">Lieu *</label>
                <input
                  type="text"
                  className="occupations-form-input"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  placeholder="Ex: Fianarantsoa"
                  required
                />
              </div>
              <div>
                <label className="occupations-form-label">
                  Description du bien
                </label>
                <input
                  type="text"
                  className="occupations-form-input"
                  value={descriptionBien}
                  onChange={(e) => setDescriptionBien(e.target.value)}
                  placeholder="Ex: Appartement au 1er étage, 3 chambres et 1 séjour…"
                />
              </div>
            </div>

            <SearchableSelect
              label="Bien concerné"
              loading={loadingBiens}
              placeholder="Rechercher un bien (n°, nom, localité)…"
              value={bienNumero}
              displayValue={bienDisplay}
              options={biensSelectOptions}
              emptyMessage="Aucun bien trouvé"
              onSelect={(id) => {
                const b = biens.find((x) => x.numeroBien === id);
                setBienNumero(id);
                setBienNom(b?.nomDuBien || "");
                if (b) {
                  setDescriptionBien(
                    `${b.numeroBien} — ${b.nomDuBien}${
                      b.localite ? ` (${b.localite})` : ""
                    }`
                  );
                }
              }}
              onClear={() => {
                setBienNumero("");
                setBienNom("");
              }}
            />

            <div className="occupations-form-row">
              <div>
                <label className="occupations-form-label">
                  Le Bailleur *
                </label>
                <input
                  type="text"
                  className="occupations-form-input"
                  value={signataireBailleur}
                  onChange={(e) => setSignataireBailleur(e.target.value)}
                  placeholder="Nom du signataire bailleur"
                  required
                />
              </div>
              <div>
                <label className="occupations-form-label">
                  L&apos;Administration *
                </label>
                <input
                  type="text"
                  className="occupations-form-input"
                  value={signataireAdministration}
                  onChange={(e) =>
                    setSignataireAdministration(e.target.value)
                  }
                  placeholder="Nom du signataire administration"
                  required
                />
              </div>
            </div>

            {/* Pièces dynamiques */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <label className="occupations-form-label" style={{ margin: 0 }}>
                  Pièces / Salles * ({pieces.length})
                </label>
                <button
                  type="button"
                  onClick={addPiece}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #C9A227",
                    background: "#fefce8",
                    color: "#A67C00",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Ajouter une pièce
                </button>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  margin: "0 0 12px",
                }}
              >
                ANB : 1 = Bon · 2 = Moyen · 3 = Nécessite un entretien.
                Caractéristiques séparées par virgule ou retour à la ligne.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {pieces.map((piece, index) => (
                  <div
                    key={piece.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 12,
                      background: "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#64748b",
                        }}
                      >
                        Pièce {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePiece(piece.id)}
                        title="Supprimer cette pièce"
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#dc2626",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        ✕ Supprimer
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 140px",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <label className="occupations-form-label">
                          Désignation *
                        </label>
                        <input
                          type="text"
                          className="occupations-form-input"
                          list={`designations-${piece.id}`}
                          value={piece.designation}
                          onChange={(e) =>
                            updatePiece(
                              piece.id,
                              "designation",
                              e.target.value
                            )
                          }
                          placeholder="Ex: Salle N°01 (Séjour)"
                          required
                        />
                        <datalist id={`designations-${piece.id}`}>
                          {SUGGESTIONS_DESIGNATION.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="occupations-form-label">
                          État *
                        </label>
                        <select
                          className="occupations-form-input"
                          value={piece.etat}
                          onChange={(e) =>
                            updatePiece(
                              piece.id,
                              "etat",
                              Number(e.target.value)
                            )
                          }
                        >
                          {ETAT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="occupations-form-label">
                        Caractéristiques spécifiques
                      </label>
                      <textarea
                        className="occupations-form-input"
                        placeholder={"Une ligne par caractéristique :\nUne porte principale en bois pleine à deux vantaux\nParquet en bois\nPlafond en bois\nPeinture à l'eau sur les murs intérieurs\n…"}
                        value={piece.caracteristiques}
                        onChange={(e) =>
                          updatePiece(
                            piece.id,
                            "caracteristiques",
                            e.target.value
                          )
                        }
                        rows={5}
                        style={{
                          resize: "vertical",
                          minHeight: 100,
                          fontFamily: "monospace",
                          fontSize: 12.5,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addPiece}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: "10px",
                  borderRadius: 8,
                  border: "1px dashed #C9A227",
                  background: "transparent",
                  color: "#A67C00",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Ajouter une autre pièce / salle
              </button>
            </div>

            <div>
              <label className="occupations-form-label">
                Observations générales
              </label>
              <textarea
                className="occupations-form-input"
                rows={3}
                value={observationsGenerales}
                onChange={(e) => setObservationsGenerales(e.target.value)}
                placeholder="Remarques complémentaires…"
                style={{ resize: "vertical", minHeight: 72 }}
              />
            </div>

            <div
              style={{
                background: "#f8fafc",
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 12.5,
                color: "#64748b",
              }}
            >
              <strong style={{ color: "#0f172a" }}>Occupation</strong>
              <br />
              N° {occupation.numeroOccupation} · Entrée le{" "}
              {formatDate(occupation.dateEntree)}
              {occupation.dateSortiePrevue
                ? ` · Sortie prévue ${formatDate(occupation.dateSortiePrevue)}`
                : ""}
            </div>
          </div>

          {error && (
            <p
              style={{
                marginTop: 12,
                color: "#dc2626",
                fontWeight: 600,
                textAlign: "center",
                fontSize: 13,
              }}
            >
              {error}
            </p>
          )}

          {pdfUrl && !error && (
            <p
              style={{
                marginTop: 12,
                color: "#16a34a",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              ✅ PDF généré avec succès.
            </p>
          )}

          <div className="occupations-form-actions">
            {!pdfUrl ? (
              <>
                <button
                  type="button"
                  className="occupations-btn-cancel"
                  onClick={onClose}
                  disabled={generating}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="occupations-btn-submit"
                  disabled={generating || loadingBiens}
                >
                  {generating ? "Génération…" : "📄 Générer le PDF"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="occupations-btn-cancel"
                  onClick={onClose}
                >
                  Fermer
                </button>
                <button
                  type="button"
                  className="occupations-btn-submit"
                  onClick={handleDownload}
                >
                  ⬇ Télécharger le PDF
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}