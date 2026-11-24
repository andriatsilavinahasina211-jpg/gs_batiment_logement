
"use client";

import React, { useState, useEffect, useCallback } from "react";
import "./DemandesPage.css";

import {
  Demande,
  StatutDemande,
  CreateDemandePayload,
  UpdateDemandePayload,
} from "./types/demande";

import { demandeApi } from "./services/demandeApi";
import { useFeedback } from "../shared/feedback";
import { piecesApi } from "../pieces-jointes/services/piecesApi";
import { occupationsApi } from "../occupations/api";
import { bauxApi } from "../baux/api";
import { attestationsApi } from "../attestations/api";
import { getStoredUser } from "../../lib/auth";

// API Travaux : adaptez le chemin si nécessaire
import { travauxApi } from "../travaux/api";

import DemandeForm from "./components/DemandeForm";
import DemandeDetailModal from "./components/DemandeDetailModal";
import DemandesTable from "./components/DemandesTable";
import DemandesFilters from "./components/DemandesFilters";

const DemandeFormComponent = DemandeForm as unknown as React.ComponentType<
  Parameters<typeof DemandeForm>[0]
>;

const ITEMS_PER_PAGE = 10;

export type PendingPiece = {
  typePiece: string;
  file: File;
  label?: string;
};

function parseDonneesMetier(description?: string | null) {
  if (!description) return null;

  const marker = "[DONNEES_METIER]";
  const idx = description.indexOf(marker);

  if (idx === -1) return null;

  try {
    return JSON.parse(
      description.slice(idx + marker.length).trim()
    );
  } catch {
    return null;
  }
}

export default function DemandesPage() {
  const { toast, confirmAction } = useFeedback();

  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<string>("TOUS");
  const [filtreType, setFiltreType] = useState<string>("TOUS");
  const [currentPage, setCurrentPage] = useState(1);

  const [selected, setSelected] = useState<Demande | null>(null);
  const [editing, setEditing] = useState<Demande | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [validating, setValidating] = useState(false);
  const canValidate = ["CHEF_SRB", "ADMINISTRATEUR"].includes(
    getStoredUser()?.role ?? ""
  );

  // =====================================================
  // CHARGEMENT DES DEMANDES
  // =====================================================

  const loadDemandes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await demandeApi.getAll({
        statut:
          filtreStatut !== "TOUS"
            ? (filtreStatut as StatutDemande)
            : undefined,

        search: search.trim() || undefined,
      });

      const filtered =
        filtreType === "TOUS"
          ? data
          : data.filter((d) => d.typeDemande === filtreType);

      setDemandes(filtered);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
      setDemandes([]);
    } finally {
      setLoading(false);
    }
  }, [search, filtreStatut, filtreType]);

  useEffect(() => {
    loadDemandes();
  }, [loadDemandes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filtreStatut, filtreType]);

  const totalPages = Math.max(
    1,
    Math.ceil(demandes.length / ITEMS_PER_PAGE)
  );

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const current = demandes.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // =====================================================
  // CRÉATION D'UNE DEMANDE
  // =====================================================

  const handleCreate = async (
    data: CreateDemandePayload | UpdateDemandePayload,
    files?: PendingPiece[]
  ) => {
    const raw = data as Record<string, unknown>;
    const rawRecensement = raw.recensement;
    const recensement =
      typeof rawRecensement === "object" && rawRecensement !== null
        ? (rawRecensement as CreateDemandePayload["recensement"])
        : undefined;

    const demandePayload: CreateDemandePayload = {
      typeDemande: raw.typeDemande as CreateDemandePayload["typeDemande"],

      demandeurId: Number(raw.demandeurId),

      statut: "EN_ATTENTE",

      bienNumero: (raw.bienNumero as string) || undefined,

      description: (raw.description as string) || undefined,

      motif: (raw.motif as string) || undefined,

      ...(recensement ? { recensement } : {}),
    };

    // 1. Création de la demande principale
    const demande = await demandeApi.create(demandePayload);

    const extra = parseDonneesMetier(
      demandePayload.description
    );

    // =====================================================
    // OCCUPATION
    // =====================================================

    if (
      demandePayload.typeDemande === "OCCUPATION" &&
      demandePayload.bienNumero
    ) {
      const occ = extra?.occupation || {};

      try {
        await occupationsApi.create({
          numeroOccupation: "",

          dateEntree:
            occ.dateEntree ||
            new Date().toISOString().slice(0, 10),

          dateSortiePrevue:
            occ.dateSortiePrevue || undefined,

          dateSortieReelle:
            occ.dateSortieReelle || undefined,

          statut: occ.statut || "EN_ATTENTE",

          delaiJouissanceMois:
            occ.delaiJouissanceMois || undefined,

          motifLiberation:
            occ.motifLiberation || undefined,

          clesRestituees: Boolean(occ.clesRestituees),

          procedureJudiciaire: Boolean(
            occ.procedureJudiciaire
          ),

          bienNumero: demandePayload.bienNumero,

          occupantId: demandePayload.demandeurId,

          demandeReference: demande.reference,
        } as any);
      } catch (err: any) {
        console.error(err);

        toast.error(
          "Création partielle",
          `La demande ${demande.reference} a été créée, mais l'occupation n'a pas pu être enregistré(e) : ${err.message || "erreur inconnue"}.`
        );
      }
    }

    // =====================================================
    // LIBERATION
    // =====================================================

    if (
      demandePayload.typeDemande === "LIBERATION" &&
      demandePayload.bienNumero
    ) {
      const lib = extra?.liberation || {};

      try {
        const all = await occupationsApi.getAll();

        const occupationActive = all.find(
          (o) =>
            o.bienNumero === demandePayload.bienNumero &&
            ["EN_COURS", "APPROUVE", "FIN_PROCHE"].includes(
              o.statut
            )
        );

        if (!occupationActive) {
          toast.warning?.(
            "Aucune occupation active",
            `La demande ${demande.reference} a été créée, mais aucune occupation active n'a été trouvée sur le bien ${demandePayload.bienNumero}.`
          ) ?? toast.error(
            "Aucune occupation active",
            `La demande ${demande.reference} a été créée, mais aucune occupation active n'a été trouvée sur le bien ${demandePayload.bienNumero}.`
          );
        } else {
          await occupationsApi.demanderLiberation(
            occupationActive.numeroOccupation,
            {
              motifLiberation:
                lib.motifLiberation ||
                demandePayload.motif ||
                "Demande de libération",

              dateSortieSouhaitee:
                lib.dateSortieReelle ||
                lib.dateSortieSouhaitee ||
                undefined,

              demandeReference: demande.reference,
            }
          );
        }
      } catch (err: any) {
        console.error(err);

        toast.error(
          "Création partielle",
          `La demande ${demande.reference} a été créée, mais la libération n'a pas pu être enregistré(e) : ${err.message || "erreur inconnue"}.`
        );
      }
    }

    // =====================================================
    // BAIL
    // =====================================================

    if (
      demandePayload.typeDemande === "BAIL" &&
      demandePayload.bienNumero
    ) {
      const bailData = extra?.bail || {};

      try {
        if (!bailData.dateDebut || !bailData.dateFin) {
          throw new Error(
            "Dates de début et de fin du bail obligatoires"
          );
        }

        await bauxApi.create({
          dateDebut: bailData.dateDebut,

          dateFin: bailData.dateFin,

          montantLoyer:
            bailData.montantLoyer != null
              ? Number(bailData.montantLoyer)
              : undefined,

          nomBailleur: bailData.nomBailleur || undefined,

          nifBailleur: bailData.nifBailleur || undefined,

          statBailleur: bailData.statBailleur || undefined,

          ribBailleur: bailData.ribBailleur || undefined,

          bienNumero: demandePayload.bienNumero,

          locataireId: demandePayload.demandeurId,

          demandeReference: demande.reference,
        } as any);
      } catch (err: any) {
        console.error(err);

        toast.error(
          "Création partielle",
          `La demande ${demande.reference} a été créée, mais le bail n'a pas pu être enregistré(e) : ${err.message || "erreur inconnue"}.`
        );
      }
    }
// =====================================================
// TRAVAUX
// =====================================================

if (
  demandePayload.typeDemande === "TRAVAUX" &&
  demandePayload.bienNumero
) {
  const travauxData = extra?.travaux || {};

  try {
    if (!travauxData.typeTravaux) {
      throw new Error("Le type de travaux est obligatoire.");
    }

    if (
      !travauxData.dateDebutPrevue ||
      !travauxData.dateFinPrevue
    ) {
      throw new Error(
        "Les dates de début et de fin prévisionnelles sont obligatoires."
      );
    }

    const payloadTravaux = {
      bienNumero: demandePayload.bienNumero,

      typeTravaux: travauxData.typeTravaux,

      dateDebutPrevue: travauxData.dateDebutPrevue,

      dateFinPrevue: travauxData.dateFinPrevue,

      montantEstimatif:
        travauxData.montantEstimatif !== undefined &&
        travauxData.montantEstimatif !== null &&
        travauxData.montantEstimatif !== ""
          ? Number(travauxData.montantEstimatif)
          : undefined,

      referenceDevis:
        travauxData.referenceDevis || undefined,

      observations:
        travauxData.observations ||
        demandePayload.motif ||
        demandePayload.description ||
        undefined,

      autorisationDpe: Boolean(
        travauxData.autorisationDpe
      ),
    };

    console.log(
      "PAYLOAD TRAVAUX ENVOYÉ :",
      payloadTravaux
    );

    const resultat = await travauxApi.create(
      payloadTravaux
    );

    console.log("TRAVAUX ENREGISTRÉS :", resultat);

    toast.success(
      "Demande et travaux enregistrés",
      `La demande ${demande.reference} et le chantier ${resultat.reference} ont été enregistrés avec succès.`
    );

  } catch (err: any) {
    console.error("ERREUR CRÉATION TRAVAUX :", err);

    toast.error(
      "Création partielle",
      `La demande ${demande.reference} a été créée, mais les travaux n'ont pas pu être enregistrés : ${err.message || "erreur inconnue"}.`
    );
  }
}

    // =====================================================
    // ATTESTATION
    // =====================================================

    if (
      demandePayload.typeDemande === "ATTESTATION"
    ) {
      const att = extra?.attestation || {};

      try {
        const typeAtt =
          att.typeAttestation === "NON_OCCUPATION"
            ? "NON_OCCUPATION"
            : "NON_LOGEMENT";

        if (
          att.visaSuperieur !== true ||
          att.declarationHonneurLegalisee !== true
        ) {
          throw new Error(
            "Visa du supérieur et déclaration sur l'honneur légalisée sont obligatoires (Section 6.5.2)"
          );
        }

        await attestationsApi.create({
          typeAttestation: typeAtt,

          demandeurId: demandePayload.demandeurId,

          visaSuperieur: true,

          declarationHonneurLegalisee: true,

          commentaire:
            demandePayload.motif || undefined,

          civilite: att.civilite,

          decretNumero: att.decretNumero,

          decretDate: att.decretDate,

          datePriseService: att.datePriseService,

          numeroOrdre: att.numeroOrdre,

          demandeReference: demande.reference,
        });
      } catch (err: any) {
        console.error(err);

        toast.error(
          "Création partielle",
          `La demande ${demande.reference} a été créée, mais l'attestation n'a pas pu être enregistré(e) : ${err.message || "erreur inconnue"}.`
        );
      }
    }

    // =====================================================
    // DOSSIER SCANNÉ / PIÈCES JOINTES
    // =====================================================

    if (files && files.length > 0) {
      const errors: string[] = [];

      for (const item of files) {
        try {
          await piecesApi.upload({
            file: item.file,

            typePiece:
              item.typePiece || "DOSSIER_SCANNE",

            demandeRef: demande.reference,

            bienNumero: demandePayload.bienNumero,
          });
        } catch (err: any) {
          errors.push(
            `${item.typePiece || "DOSSIER_SCANNE"}: ${
              err.message || "échec"
            }`
          );
        }
      }

      if (errors.length > 0) {
        toast.error(
          "Pièces jointes non enregistrées",
          `La demande ${demande.reference} a été créée, mais certaines pièces jointes ont échoué : ${errors.join(" ; ")}.`
        );
      }
    }

    setShowCreate(false);

    await loadDemandes();
  };

  // =====================================================
  // MODIFICATION D'UNE DEMANDE
  // =====================================================

  const handleUpdate = async (
    payload: UpdateDemandePayload,
    _files?: PendingPiece[]
  ) => {
    if (!editing) return;

    const STATUTS: StatutDemande[] = [
      "EN_ATTENTE",
      "EN_COURS",
      "VALIDEE",
      "REJETEE",
      "TERMINEE",
    ];

    const clean: UpdateDemandePayload = {
      typeDemande: payload.typeDemande,

      bienNumero: payload.bienNumero ?? null,

      description: payload.description,

      motif: payload.motif,

      dateValidation: payload.dateValidation,
    };

    if (
      payload.statut &&
      STATUTS.includes(payload.statut)
    ) {
      clean.statut = payload.statut;
    }

    const updated = await demandeApi.update(
      editing.reference,
      clean
    );

    setEditing(null);

    setSelected(updated);

    await loadDemandes();
  };

  // =====================================================
  // SUPPRESSION
  // =====================================================

  const handleDelete = async (d: Demande) => {
    if (
      !(await confirmAction({
        title: "Confirmer la suppression",
        message: `Vous êtes sur le point de supprimer définitivement la demande « ${d.reference} ». Cette action est irréversible.`,
        confirmLabel: "Supprimer",
        type: "warning",
      }))
    ) {
      return;
    }

    try {
      await demandeApi.remove(d.reference);

      setSelected(null);

      await loadDemandes();
      toast.success("Demande supprimée", `La demande ${d.reference} a été supprimée avec succès.`);
    } catch (err: any) {
      toast.error("Échec de la suppression", err.message || "Une erreur est survenue lors de la suppression de la demande.");
    }
  };

  // =====================================================
  // MODIFICATION
  // =====================================================

  const handleEdit = (d: Demande) => {
    setSelected(null);
    setEditing(d);
  };

  const handleValidate = async (d: Demande) => {
    if (
      !(await confirmAction({
        title: "Confirmer la validation",
        message: `Valider la demande « ${d.reference} » ?`,
        confirmLabel: "Valider",
        type: "info",
      }))
    ) {
      return;
    }

    setValidating(true);
    try {
      const updated = await demandeApi.updateStatut(d.reference, "VALIDEE");
      setSelected((currentSelected) =>
        currentSelected?.reference === updated.reference
          ? {
              ...currentSelected,
              ...updated,
              validations: currentSelected.validations,
            }
          : currentSelected
      );
      await loadDemandes();
      toast.success("Demande validée", `La demande ${d.reference} a été validée.`);
    } catch (err: unknown) {
      toast.error(
        "Échec de la validation",
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la validation de la demande."
      );
    } finally {
      setValidating(false);
    }
  };

  const handleReject = async (d: Demande) => {
    const motifRefus = window.prompt(
      `Veuillez indiquer le motif du refus pour la demande ${d.reference} :`,
      "Non conforme aux critères réglementaires"
    );

    if (motifRefus === null) return; // Annulé par l'utilisateur
    if (!motifRefus.trim()) {
      toast.error("Motif requis", "Le motif de refus est obligatoire pour rejeter la demande.");
      return;
    }

    setValidating(true);
    try {
      const updated = await demandeApi.updateStatut(d.reference, "REJETEE", motifRefus.trim());
      setSelected((currentSelected) =>
        currentSelected?.reference === updated.reference
          ? {
              ...currentSelected,
              ...updated,
              motif: motifRefus.trim(),
            }
          : currentSelected
      );
      await loadDemandes();
      toast.success("Demande refusée", `La demande ${d.reference} a été rejetée avec succès.`);
    } catch (err: unknown) {
      toast.error(
        "Échec du refus",
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors du rejet de la demande."
      );
    } finally {
      setValidating(false);
    }
  };

  // =====================================================
  // AFFICHAGE
  // =====================================================

  return (
    <div className="demandes-page">

      {/* EN-TÊTE */}

      <div className="demandes-header">
        <div>
          <h2>Gestion des Demandes</h2>

          <p>
            {loading
              ? "Chargement..."
              : `${demandes.length} demande${
                  demandes.length > 1 ? "s" : ""
                }`}
          </p>
        </div>

        <button
          type="button"
          className="demandes-btn-primary"
          onClick={() => setShowCreate(true)}
        >
          + Nouvelle demande
        </button>
      </div>

      {/* FILTRES */}

      <DemandesFilters
        search={search}
        filtreType={filtreType}
        filtreStatut={filtreStatut}
        onSearchChange={setSearch}
        onTypeChange={setFiltreType}
        onStatutChange={setFiltreStatut}
      />

      {/* ERREUR */}

      {error && (
        <div className="demandes-error-banner">
          {error}
        </div>
      )}

      {/* TABLEAU */}

      {loading ? (
        <div className="demandes-empty">
          Chargement des demandes...
        </div>
      ) : current.length === 0 ? (
        <div className="demandes-empty">
          Aucune demande ne correspond à votre recherche.
        </div>
      ) : (
        <>
          <DemandesTable
            demandes={current}
            onSelect={setSelected}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          {/* PAGINATION */}

          {totalPages > 1 && (
            <div className="demandes-pagination">

              <button
                type="button"
                className="demandes-page-btn"
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.max(1, p - 1)
                  )
                }
                disabled={currentPage === 1}
              >
                ← Précédent
              </button>

              {Array.from(
                { length: totalPages },
                (_, i) => i + 1
              ).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`demandes-page-num${
                    page === currentPage
                      ? " active"
                      : ""
                  }`}
                  onClick={() =>
                    setCurrentPage(page)
                  }
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                className="demandes-page-btn"
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(totalPages, p + 1)
                  )
                }
                disabled={currentPage === totalPages}
              >
                Suivant →
              </button>
            </div>
          )}

          <div className="demandes-pagination-info">
            Page {currentPage} sur {totalPages} — Affichage de{" "}
            {startIndex + 1} à{" "}
            {Math.min(
              startIndex + ITEMS_PER_PAGE,
              demandes.length
            )}{" "}
            sur {demandes.length}
          </div>
        </>
      )}

      {/* DÉTAIL */}

      {selected && (
        <DemandeDetailModal
          demande={selected}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canValidate={canValidate}
          isValidating={validating}
          onValidate={handleValidate}
          onReject={handleReject}
        />
      )}

      {/* MODIFICATION */}

      {editing && (
        <DemandeFormComponent
          mode="edit"
          demande={editing}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
        />
      )}

      {/* CRÉATION */}

      {showCreate && (
        <DemandeFormComponent
          mode="create"
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}

    </div>
  );
}