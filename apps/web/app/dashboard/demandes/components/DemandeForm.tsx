"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Demande,
  TypeDemande,
  StatutDemande,
  CreateDemandePayload,
  UpdateDemandePayload,
  TypeTravaux,
} from "../types/demande";
import { SearchableSelect, type SearchableOption } from "./SearchableSelect";

/* ───────────────── Types locaux ───────────────── */
type BienOption = {
  numeroBien: string;
  nomDuBien: string;
  localite?: string;
  statut?: string;
};

type OccupantOption = {
  occupanId: number;
  nom: string;
  prenom: string;
  matricule?: string;
  ministere?: string;
};

type OccupationLite = {
  numeroOccupation: string;
  bienNumero: string;
  bienNom?: string;
  occupantId?: number;
  statut: string;
  dateSortiePrevue?: string;
  dateSortieReelle?: string;
};

type OccupationStatus =
  | "EN_ATTENTE"
  | "EN_VALIDATION"
  | "APPROUVE"
  | "EN_COURS"
  | "FIN_PROCHE"
  | "DEMANDE_LIBERATION"
  | "LIBERATION_VALIDEE"
  | "LIBERE"
  | "SANS_TITRE";

type TypeAttestationLocal = "NON_LOGEMENT" | "NON_OCCUPATION";

export type PendingPiece = {
  typePiece: string;
  file: File;
  label?: string;
};

/* ───────────────── Labels ───────────────── */
const typeLabel: Record<TypeDemande, string> = {
  OCCUPATION: "Demande d'occupation",
  LIBERATION: "Demande de libération",
  BAIL: "Demande de contrat de bail",
  ATTESTATION: "Demande d'attestation",
  RECENSEMENT: "Demande de Quitus / Recensement",
  TRAVAUX: "Demande de travaux",
};

const typeDescription: Record<TypeDemande, string> = {
  OCCUPATION: "Attribution d'un logement ou bureau de fonction",
  LIBERATION: "Libération d'un bien actuellement occupé",
  BAIL: "Mise en location d'un bien (contrat de bail)",
  ATTESTATION: "Attestation de non-logement ou de non-occupation",
  RECENSEMENT: "Quitus annuel / recensement du parc",
  TRAVAUX: "Demande de travaux sur un bien",
};

const statutDemandeLabel: Record<StatutDemande, string> = {
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  VALIDEE: "Validée",
  REJETEE: "Rejetée",
  TERMINEE: "Terminée",
};

const STATUTS_DEMANDE_VALIDES: StatutDemande[] = [
  "EN_ATTENTE",
  "EN_COURS",
  "VALIDEE",
  "REJETEE",
  "TERMINEE",
];

const statutOccupationLabel: Record<OccupationStatus, string> = {
  EN_ATTENTE: "En attente",
  EN_VALIDATION: "En validation",
  APPROUVE: "Approuvé",
  EN_COURS: "En cours",
  FIN_PROCHE: "Fin proche",
  DEMANDE_LIBERATION: "Demande de libération",
  LIBERATION_VALIDEE: "Libération validée",
  LIBERE: "Libéré",
  SANS_TITRE: "Sans titre",
};

const STATUTS_OCCUPATION_VALIDES: OccupationStatus[] = [
  "EN_ATTENTE",
  "EN_VALIDATION",
  "APPROUVE",
  "EN_COURS",
  "FIN_PROCHE",
  "DEMANDE_LIBERATION",
  "LIBERATION_VALIDEE",
  "LIBERE",
  "SANS_TITRE",
];

const STATUTS_OCC_ACTIFS = ["EN_COURS", "APPROUVE", "FIN_PROCHE"];

const STATUTS_OCCUPANT_OCCUPE = [
  "EN_ATTENTE",
  "EN_VALIDATION",
  "APPROUVE",
  "EN_COURS",
  "FIN_PROCHE",
  "DEMANDE_LIBERATION",
  "LIBERATION_VALIDEE",
];

/* ───────────────── Helpers ───────────────── */
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

function toDateInput(value?: string | Date | null): string | undefined {
  if (!value) return undefined;
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return String(value).slice(0, 10);
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token") || localStorage.getItem("access_token")
      : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchBiens(): Promise<BienOption[]> {
  try {
    const res = await fetch(`${API_URL}/dashboard/biens`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const raw = await res.json();
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.biens)
          ? raw.biens
          : Array.isArray(raw?.items)
            ? raw.items
            : [];
    return list.map((b: any) => ({
      numeroBien: b.numeroBien ?? "",
      nomDuBien: b.nomDuBien ?? b.nom ?? "",
      localite: b.localite ?? "",
      statut: b.statut ?? "",
    }));
  } catch {
    return [];
  }
}

async function fetchOccupants(): Promise<OccupantOption[]> {
  try {
    const res = await fetch(`${API_URL}/dashboard/occupants`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const raw = await res.json();
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.occupants)
          ? raw.occupants
          : Array.isArray(raw?.items)
            ? raw.items
            : [];
    return list.map((o: any) => ({
      occupanId: o.occupanId,
      nom: o.nom ?? "",
      prenom: o.prenom ?? "",
      matricule: o.matricule ?? "",
      ministere: o.ministere ?? "",
    }));
  } catch {
    return [];
  }
}

async function fetchOccupations(): Promise<OccupationLite[]> {
  try {
    const res = await fetch(`${API_URL}/dashboard/occupations`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const raw = await res.json();
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.occupations)
          ? raw.occupations
          : Array.isArray(raw?.items)
            ? raw.items
            : [];
    return list.map((o: any) => ({
      numeroOccupation: o.numeroOccupation ?? "",
      bienNumero: o.bienNumero ?? o.bien?.numeroBien ?? "",
      bienNom: o.bienNom ?? o.bien?.nomDuBien ?? "",
      occupantId:
        o.occupantId ??
        o.occupant?.occupanId ??
        o.demandeurId ??
        o.demandeur?.occupanId ??
        undefined,
      statut: o.statut ?? "",
      dateSortiePrevue: toDateInput(o.dateSortiePrevue),
      dateSortieReelle: toDateInput(o.dateSortieReelle),
    }));
  } catch {
    return [];
  }
}

/* ───────────────── Props ───────────────── */
interface DemandeFormProps {
  mode: "create" | "edit";
  demande?: Demande;
  onClose: () => void;
  onSave: (
    data: CreateDemandePayload | UpdateDemandePayload,
    files?: PendingPiece[]
  ) => Promise<Demande | void>;
}

export default function DemandeForm({
  mode,
  demande,
  onClose,
  onSave,
}: DemandeFormProps) {
  const [step, setStep] = useState<"choose-type" | "form">(
    mode === "edit" ? "form" : "choose-type"
  );
  const [typeDemande, setTypeDemande] = useState<TypeDemande>(
    demande?.typeDemande || "OCCUPATION"
  );

  const [statutDemande, setStatutDemande] = useState<StatutDemande>(
    demande?.statut && STATUTS_DEMANDE_VALIDES.includes(demande.statut)
      ? demande.statut
      : "EN_ATTENTE"
  );

  const [demandeurId, setDemandeurId] = useState(
    demande?.demandeurId ? String(demande.demandeurId) : ""
  );
  const [demandeurNom, setDemandeurNom] = useState(
    demande?.demandeur
      ? `${demande.demandeur.prenom} ${demande.demandeur.nom}`
      : ""
  );
  const [bienNumero, setBienNumero] = useState(demande?.bienNumero || "");
  const [bienNom, setBienNom] = useState(demande?.bien?.nomDuBien || "");
  const [motif, setMotif] = useState(demande?.motif || "");
  const [description, setDescription] = useState(demande?.description || "");
  const [dateValidation, setDateValidation] = useState(
    demande?.dateValidation?.slice(0, 10) || ""
  );

  const [statutOccupation, setStatutOccupation] =
    useState<OccupationStatus>("EN_ATTENTE");
  const [dateEntree, setDateEntree] = useState("");
  const [delaiJouissanceMois, setDelaiJouissanceMois] = useState<number | "">(
    ""
  );
  const [dateSortiePrevue, setDateSortiePrevue] = useState("");
  const [dateSortieReelle, setDateSortieReelle] = useState("");
  const [motifLiberation, setMotifLiberation] = useState("");
  const [clesRestituees, setClesRestituees] = useState(false);
  const [procedureJudiciaire, setProcedureJudiciaire] = useState(false);

  const [dateDebutBail, setDateDebutBail] = useState("");
  const [dureeBailMois, setDureeBailMois] = useState<number | "">("");
  const [dateFinBail, setDateFinBail] = useState("");
  const [montantLoyer, setMontantLoyer] = useState<number | "">("");
  const [nomBailleur, setNomBailleur] = useState("");
  const [nifBailleur, setNifBailleur] = useState("");
  const [statBailleur, setStatBailleur] = useState("");
  const [ribBailleur, setRibBailleur] = useState("");

  /* Attestation */
  const [typeAttestation, setTypeAttestation] =
    useState<TypeAttestationLocal>("NON_LOGEMENT");
  const [civiliteAttestation, setCiviliteAttestation] = useState("Monsieur");
  const [decretNumero, setDecretNumero] = useState("");
  const [decretDate, setDecretDate] = useState("");
  const [datePriseService, setDatePriseService] = useState("");
  const [numeroOrdre, setNumeroOrdre] = useState("");
  const [visaSuperieur, setVisaSuperieur] = useState(false);
  const [declarationHonneurLegalisee, setDeclarationHonneurLegalisee] =
    useState(false);

  const [anneeRecensement, setAnneeRecensement] = useState(
    new Date().getFullYear()
  );
  const [etatBatiment, setEtatBatiment] = useState<
    "BON" | "MOYEN" | "MAUVAIS"
  >("BON");
  const [observationsQuitus, setObservationsQuitus] = useState("");

  const [typeTravaux, setTypeTravaux] = useState<TypeTravaux>("ENTRETIEN");
  const [montantEstimatif, setMontantEstimatif] = useState<number | "">("");
  const [dateDebutTravaux, setDateDebutTravaux] = useState("");
  const [dateFinTravaux, setDateFinTravaux] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liberationHint, setLiberationHint] = useState<string | null>(null);

  const [scannedFile, setScannedFile] = useState<File | null>(null);

  const [biens, setBiens] = useState<BienOption[]>([]);
  const [occupants, setOccupants] = useState<OccupantOption[]>([]);
  const [occupations, setOccupations] = useState<OccupationLite[]>([]);
  const [loadingBiens, setLoadingBiens] = useState(true);
  const [loadingOccupants, setLoadingOccupants] = useState(true);
  const [loadingOccupations, setLoadingOccupations] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBiens(true);
      setLoadingOccupants(true);
      setLoadingOccupations(true);
      try {
        const [biensList, occupantsList, occList] = await Promise.all([
          fetchBiens(),
          fetchOccupants(),
          fetchOccupations(),
        ]);
        if (!cancelled) {
          setBiens(biensList);
          setOccupants(occupantsList);
          setOccupations(occList);
        }
      } finally {
        if (!cancelled) {
          setLoadingBiens(false);
          setLoadingOccupants(false);
          setLoadingOccupations(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyBienFromOccupant = (occupantIdStr: string) => {
    if (!occupantIdStr) {
      setBienNumero("");
      setBienNom("");
      setDateSortieReelle("");
      setLiberationHint(null);
      return;
    }

    const id = Number(occupantIdStr);
    const actives = occupations.filter(
      (o) =>
        o.occupantId === id &&
        STATUTS_OCC_ACTIFS.includes(o.statut) &&
        !!o.bienNumero
    );

    if (actives.length === 0) {
      setBienNumero("");
      setBienNom("");
      setDateSortieReelle("");
      setLiberationHint(
        "Aucune occupation active trouvée pour cet occupant (EN_COURS / APPROUVE / FIN_PROCHE)."
      );
      return;
    }

    const chosen = actives[0];
    if (!chosen) return;

    setBienNumero(chosen.bienNumero);
    setBienNom(chosen.bienNom || "");

    const dateSortie =
      chosen.dateSortieReelle || chosen.dateSortiePrevue || "";
    setDateSortieReelle(dateSortie);

    const dateLabel = dateSortie
      ? ` — sortie ${dateSortie}${
          chosen.dateSortieReelle ? " (réelle)" : " (prévue)"
        }`
      : " — aucune date de sortie sur l'occupation";

    setLiberationHint(
      actives.length === 1
        ? `Bien détecté : ${chosen.bienNumero}${
            chosen.bienNom ? ` — ${chosen.bienNom}` : ""
          } (${chosen.statut})${dateLabel}`
        : `${actives.length} occupations actives — bien ${chosen.bienNumero} sélectionné${dateLabel}. Vérifiez si besoin.`
    );
  };

  useEffect(() => {
    if (typeDemande === "LIBERATION" && demandeurId) {
      applyBienFromOccupant(demandeurId);
    } else if (typeDemande !== "LIBERATION") {
      setLiberationHint(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeDemande, demandeurId, occupations]);

  useEffect(() => {
    setScannedFile(null);
  }, [typeDemande]);

  const biensOptions: SearchableOption[] = useMemo(() => {
    let list = biens;
    if (
      mode === "create" &&
      (typeDemande === "OCCUPATION" || typeDemande === "BAIL")
    ) {
      const libres = biens.filter((b) => b.statut === "LIBRE");
      list = libres.length > 0 ? libres : biens;
    }
    return list.map((b) => ({
      id: b.numeroBien,
      label: `${b.numeroBien} — ${b.nomDuBien}`,
      subLabel: [b.localite, b.statut].filter(Boolean).join(" · "),
      searchText: `${b.numeroBien} ${b.nomDuBien} ${b.localite || ""} ${
        b.statut || ""
      }`,
    }));
  }, [biens, mode, typeDemande]);

  const occupantsOptions: SearchableOption[] = useMemo(() => {
    let list = occupants;

    if (mode === "create" && typeDemande === "OCCUPATION") {
      const occupiedIds = new Set<number>();
      for (const o of occupations) {
        if (
          o.occupantId != null &&
          o.bienNumero &&
          STATUTS_OCCUPANT_OCCUPE.includes(o.statut)
        ) {
          occupiedIds.add(Number(o.occupantId));
        }
      }
      list = occupants.filter((o) => !occupiedIds.has(o.occupanId));
    } else if (mode === "create" && typeDemande === "LIBERATION") {
      const activeIds = new Set<number>();
      for (const o of occupations) {
        if (
          o.occupantId != null &&
          o.bienNumero &&
          STATUTS_OCC_ACTIFS.includes(o.statut)
        ) {
          activeIds.add(Number(o.occupantId));
        }
      }
      list = occupants.filter((o) => activeIds.has(o.occupanId));
    }

    return list.map((o) => ({
      id: String(o.occupanId),
      label: `${o.prenom} ${o.nom}`,
      subLabel: [o.matricule, o.ministere].filter(Boolean).join(" · "),
      searchText: `${o.prenom} ${o.nom} ${o.matricule || ""} ${
        o.ministere || ""
      } ${o.occupanId}`,
    }));
  }, [occupants, occupations, mode, typeDemande]);

  const bienDisplay = bienNumero
    ? `${bienNumero}${bienNom ? ` — ${bienNom}` : ""}`
    : "";

  const occupantDisplay =
    demandeurNom ||
    (demandeurId
      ? occupantsOptions.find((o) => o.id === demandeurId)?.label ||
        (() => {
          const o = occupants.find((x) => String(x.occupanId) === demandeurId);
          return o ? `${o.prenom} ${o.nom}` : "";
        })()
      : "");

  useEffect(() => {
    if (typeDemande !== "OCCUPATION") return;
    if (dateEntree && delaiJouissanceMois && Number(delaiJouissanceMois) > 0) {
      const sortie = addMonthsToDate(dateEntree, Number(delaiJouissanceMois));
      setDateSortiePrevue(sortie);
      setDateSortieReelle(sortie);
    }
  }, [dateEntree, delaiJouissanceMois, typeDemande]);

  useEffect(() => {
    if (typeDemande !== "BAIL") return;
    if (dateDebutBail && dureeBailMois && Number(dureeBailMois) > 0) {
      setDateFinBail(addMonthsToDate(dateDebutBail, Number(dureeBailMois)));
    }
  }, [dateDebutBail, dureeBailMois, typeDemande]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!demandeurId.trim()) {
      setError("Le demandeur (occupant) est obligatoire.");
      return;
    }
    if (
      (typeDemande === "OCCUPATION" ||
        typeDemande === "BAIL" ||
        typeDemande === "LIBERATION" ||
        typeDemande === "TRAVAUX" ||
        typeDemande === "RECENSEMENT") &&
      !bienNumero.trim()
    ) {
      setError(
        typeDemande === "LIBERATION"
          ? "Aucun bien lié à cet occupant. Impossible de demander une libération."
          : "Le bien est obligatoire pour ce type de demande."
      );
      return;
    }
    if (typeDemande === "OCCUPATION" && !dateEntree) {
      setError("La date d'entrée est obligatoire.");
      return;
    }
    if (typeDemande === "BAIL") {
      if (!dateDebutBail || !dateFinBail) {
        setError(
          "La date de début et la durée (ou la date de fin) sont obligatoires."
        );
        return;
      }
    }
    if (typeDemande === "TRAVAUX") {
      if (!dateDebutTravaux || !dateFinTravaux) {
        setError(
          "Les dates de début et de fin prévues des travaux sont obligatoires."
        );
        return;
      }
      if (dateDebutTravaux >= dateFinTravaux) {
        setError(
          "La date de fin prévue doit être postérieure à la date de début."
        );
        return;
      }
    }
    if (typeDemande === "ATTESTATION") {
      if (!visaSuperieur || !declarationHonneurLegalisee) {
        setError(
          "Visa du supérieur et déclaration sur l'honneur légalisée sont obligatoires (Section 6.5.2)."
        );
        return;
      }
    }
    if (mode === "edit" && !STATUTS_DEMANDE_VALIDES.includes(statutDemande)) {
      setError(
        "Statut de la demande invalide. Valeurs : EN_ATTENTE, EN_COURS, VALIDEE, REJETEE, TERMINEE"
      );
      return;
    }
    if (
      typeDemande === "OCCUPATION" &&
      !STATUTS_OCCUPATION_VALIDES.includes(statutOccupation)
    ) {
      setError("Statut d'occupation invalide.");
      return;
    }

    setSaving(true);
    try {
      const extra: Record<string, unknown> = {};

      if (typeDemande === "OCCUPATION") {
        extra.occupation = {
          statut: statutOccupation,
          dateEntree,
          delaiJouissanceMois: delaiJouissanceMois || undefined,
          dateSortiePrevue: dateSortiePrevue || undefined,
          dateSortieReelle: dateSortieReelle || undefined,
          motifLiberation: motifLiberation || undefined,
          clesRestituees,
          procedureJudiciaire,
        };
      }
      if (typeDemande === "BAIL") {
        extra.bail = {
          dateDebut: dateDebutBail,
          dateFin: dateFinBail,
          montantLoyer: montantLoyer === "" ? undefined : Number(montantLoyer),
          nomBailleur: nomBailleur || undefined,
          nifBailleur: nifBailleur || undefined,
          statBailleur: statBailleur || undefined,
          ribBailleur: ribBailleur || undefined,
        };
      }
      if (typeDemande === "LIBERATION") {
        extra.liberation = {
          motifLiberation: motifLiberation || motif || undefined,
          clesRestituees,
          procedureJudiciaire,
          dateSortieReelle: dateSortieReelle || undefined,
          dateSortieSouhaitee: dateSortieReelle || undefined,
        };
      }
      if (typeDemande === "ATTESTATION") {
        extra.attestation = {
          typeAttestation,
          visaSuperieur,
          declarationHonneurLegalisee,
          civilite: civiliteAttestation,
          decretNumero: decretNumero.trim() || undefined,
          decretDate: decretDate || undefined,
          datePriseService: datePriseService || undefined,
          numeroOrdre: numeroOrdre.trim() || undefined,
        };
      }
      if (typeDemande === "RECENSEMENT") {
        extra.quitus = {
          annee: anneeRecensement,
          etatBatiment,
          observations: observationsQuitus || undefined,
        };
      }
      if (typeDemande === "TRAVAUX") {
        extra.travaux = {
          typeTravaux,
          montantEstimatif:
            montantEstimatif === "" ? undefined : Number(montantEstimatif),
          dateDebutPrevue: dateDebutTravaux || undefined,
          dateFinPrevue: dateFinTravaux || undefined,
        };
      }

      const fullDescription = description
        ? `${description}\n\n[DONNEES_METIER]${JSON.stringify(extra)}`
        : `[DONNEES_METIER]${JSON.stringify(extra)}`;

      if (mode === "create") {
        const payload: CreateDemandePayload = {
          typeDemande,
          statut: "EN_ATTENTE",
          demandeurId: Number(demandeurId),
          bienNumero: bienNumero || undefined,
          description: fullDescription,
          motif: motif || undefined,
          ...(typeDemande === "TRAVAUX"
            ? {
                travaux: {
                  typeTravaux,
                  dateDebutPrevue: dateDebutTravaux,
                  dateFinPrevue: dateFinTravaux,
                  montantEstimatif:
                    montantEstimatif === "" ? undefined : Number(montantEstimatif),
                  observations: description || undefined,
                },
              }
            : {}),
          ...(typeDemande === "RECENSEMENT"
            ? {
                recensement: {
                  annee: anneeRecensement,
                  etatBatiment,
                  observations: observationsQuitus || undefined,
                },
              }
            : {}),
        };
        const files: PendingPiece[] = scannedFile
          ? [
              {
                typePiece: "DOSSIER_SCANNE",
                file: scannedFile,
                label: "Dossier scanné",
              },
            ]
          : [];
        await onSave(payload, files);
      } else {
        const payload: UpdateDemandePayload = {
          typeDemande,
          statut: statutDemande,
          bienNumero: bienNumero || null,
          description: fullDescription,
          motif: motif || undefined,
          dateValidation:
            statutDemande === "VALIDEE" ||
            statutDemande === "REJETEE" ||
            statutDemande === "TERMINEE"
              ? dateValidation || undefined
              : undefined,
        };
        await onSave(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const occupantEmptyMessage =
    typeDemande === "OCCUPATION"
      ? "Aucun occupant libre (tous sont déjà liés à un bien)"
      : typeDemande === "LIBERATION"
        ? "Aucun occupant avec occupation active"
        : "Aucun occupant trouvé";

  const occupantPlaceholder =
    typeDemande === "OCCUPATION"
      ? "Rechercher un occupant libre (nom, matricule)…"
      : typeDemande === "LIBERATION"
        ? "Rechercher un occupant en occupation…"
        : "Rechercher un occupant (nom, matricule)…";

  /* ═══════════ ÉTAPE 1 ═══════════ */
  if (step === "choose-type") {
    return (
      <div className="demandes-modal-overlay form" onClick={onClose}>
        <div
          className="demandes-form-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="demandes-form-header">
            <div>
              <h2>Nouvelle demande</h2>
              <p>Choisissez le type de demande à effectuer</p>
            </div>
            <button
              type="button"
              className="demandes-form-close"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div className="demandes-type-grid">
            {(Object.keys(typeLabel) as TypeDemande[]).map((type) => (
              <button
                key={type}
                type="button"
                className={`demandes-type-card${
                  typeDemande === type ? " selected" : ""
                }`}
                onClick={() => setTypeDemande(type)}
              >
                <span className="demandes-type-card-title">
                  {typeLabel[type]}
                </span>
                <span className="demandes-type-card-desc">
                  {typeDescription[type]}
                </span>
              </button>
            ))}
          </div>

          <div className="demandes-form-actions">
            <button
              type="button"
              className="demandes-btn-cancel"
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              type="button"
              className="demandes-btn-submit"
              onClick={() => setStep("form")}
            >
              Continuer →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════ ÉTAPE 2 ═══════════ */
  return (
    <div className="demandes-modal-overlay form" onClick={onClose}>
      <div
        className="demandes-form-modal demandes-form-modal-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="demandes-form-header">
          <div>
            {mode === "create" && (
              <button
                type="button"
                className="demandes-back-btn"
                onClick={() => setStep("choose-type")}
              >
                ← Changer de type
              </button>
            )}
            <h2>{typeLabel[typeDemande]}</h2>
            <p>{typeDescription[typeDemande]}</p>
          </div>
          <button
            type="button"
            className="demandes-form-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="demandes-form-body">
          {error && <div className="demandes-form-error">{error}</div>}

          <div className="demandes-form-fields">
            {mode === "edit" && (
              <>
                <div>
                  <label className="demandes-form-label">
                    Statut de la demande *
                  </label>
                  <select
                    required
                    value={statutDemande}
                    onChange={(e) => {
                      const v = e.target.value as StatutDemande;
                      if (STATUTS_DEMANDE_VALIDES.includes(v)) {
                        setStatutDemande(v);
                      }
                    }}
                    className="demandes-form-input"
                  >
                    {STATUTS_DEMANDE_VALIDES.map((key) => (
                      <option key={key} value={key}>
                        {statutDemandeLabel[key]}
                      </option>
                    ))}
                  </select>
                </div>

                {(statutDemande === "VALIDEE" ||
                  statutDemande === "REJETEE" ||
                  statutDemande === "TERMINEE") && (
                  <div>
                    <label className="demandes-form-label">
                      Date de validation
                    </label>
                    <input
                      type="date"
                      value={dateValidation}
                      onChange={(e) => setDateValidation(e.target.value)}
                      className="demandes-form-input"
                    />
                  </div>
                )}
              </>
            )}

            {mode === "create" && (
              <p className="demandes-form-hint">
                À la création, le statut de la demande est automatiquement « En
                attente ».
              </p>
            )}

            <SearchableSelect
              label={
                typeDemande === "OCCUPATION"
                  ? "Demandeur (Occupant libre)"
                  : "Demandeur (Occupant)"
              }
              required
              loading={loadingOccupants || loadingOccupations}
              placeholder={occupantPlaceholder}
              value={demandeurId}
              displayValue={occupantDisplay}
              options={occupantsOptions}
              emptyMessage={occupantEmptyMessage}
              onSelect={(id) => {
                const occ = occupants.find((x) => String(x.occupanId) === id);
                setDemandeurId(id);
                setDemandeurNom(occ ? `${occ.prenom} ${occ.nom}` : "");
                if (typeDemande === "LIBERATION") {
                  applyBienFromOccupant(id);
                }
              }}
              onClear={() => {
                setDemandeurId("");
                setDemandeurNom("");
                if (typeDemande === "LIBERATION") {
                  setBienNumero("");
                  setBienNom("");
                  setDateSortieReelle("");
                  setLiberationHint(null);
                }
              }}
            />

            {typeDemande !== "ATTESTATION" && (
              <>
                {typeDemande === "LIBERATION" ? (
                  <div>
                    <label className="demandes-form-label">
                      Bien (détecté automatiquement) *
                    </label>
                    <input
                      type="text"
                      className="demandes-form-input"
                      value={
                        loadingOccupations
                          ? "Recherche de l'occupation…"
                          : bienDisplay || ""
                      }
                      readOnly
                      placeholder="Sélectionnez d'abord un occupant…"
                    />
                    {liberationHint && (
                      <p
                        className="demandes-form-hint"
                        style={{
                          color: bienNumero ? "#A67C00" : "#dc2626",
                          marginTop: 6,
                        }}
                      >
                        {liberationHint}
                      </p>
                    )}
                  </div>
                ) : (
                  <SearchableSelect
                    label="Bien"
                    required={
                      typeDemande === "OCCUPATION" || typeDemande === "BAIL"
                    }
                    loading={loadingBiens}
                    placeholder="Rechercher un bien (n°, nom, localité)…"
                    value={bienNumero}
                    displayValue={bienDisplay}
                    options={biensOptions}
                    emptyMessage={
                      mode === "create" &&
                      (typeDemande === "OCCUPATION" || typeDemande === "BAIL")
                        ? "Aucun bien libre trouvé"
                        : "Aucun bien trouvé"
                    }
                    onSelect={(id) => {
                      const b = biens.find((x) => x.numeroBien === id);
                      setBienNumero(id);
                      setBienNom(b?.nomDuBien || "");
                    }}
                    onClear={() => {
                      setBienNumero("");
                      setBienNom("");
                    }}
                  />
                )}
              </>
            )}

            <div>
              <label className="demandes-form-label">Motif</label>
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className="demandes-form-input"
                placeholder="Motif de la demande"
              />
            </div>

            <div>
              <label className="demandes-form-label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="demandes-form-textarea"
                placeholder="Détails complémentaires..."
              />
            </div>

            {typeDemande === "OCCUPATION" && (
              <div className="demandes-form-section">
                <div className="demandes-form-section-title">
                  Informations d&apos;occupation
                </div>
                <div>
                  <label className="demandes-form-label">
                    Statut de l&apos;occupation *
                  </label>
                  <select
                    required
                    value={statutOccupation}
                    onChange={(e) => {
                      const v = e.target.value as OccupationStatus;
                      if (STATUTS_OCCUPATION_VALIDES.includes(v)) {
                        setStatutOccupation(v);
                      }
                    }}
                    className="demandes-form-input"
                  >
                    {STATUTS_OCCUPATION_VALIDES.map((key) => (
                      <option key={key} value={key}>
                        {statutOccupationLabel[key]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="demandes-form-row">
                  <div>
                    <label className="demandes-form-label">
                      Délai de jouissance (mois)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={delaiJouissanceMois}
                      onChange={(e) =>
                        setDelaiJouissanceMois(
                          e.target.value ? Number(e.target.value) : ""
                        )
                      }
                      className="demandes-form-input"
                      placeholder="Ex: 12"
                    />
                  </div>
                  <div>
                    <label className="demandes-form-label">
                      Date d&apos;entrée *
                    </label>
                    <input
                      type="date"
                      required
                      value={dateEntree}
                      onChange={(e) => setDateEntree(e.target.value)}
                      className="demandes-form-input"
                    />
                  </div>
                </div>
                <div className="demandes-form-row">
                  <div>
                    <label className="demandes-form-label">
                      Date sortie prévue
                    </label>
                    <input
                      type="date"
                      value={dateSortiePrevue}
                      onChange={(e) => setDateSortiePrevue(e.target.value)}
                      className="demandes-form-input"
                    />
                  </div>
                  <div>
                    <label className="demandes-form-label">
                      Date sortie réelle
                    </label>
                    <input
                      type="date"
                      value={dateSortieReelle}
                      onChange={(e) => setDateSortieReelle(e.target.value)}
                      className="demandes-form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {typeDemande === "LIBERATION" && (
              <div className="demandes-form-section">
                <div className="demandes-form-section-title">
                  Informations de libération
                </div>
                <div>
                  <label className="demandes-form-label">
                    Motif de libération
                  </label>
                  <input
                    type="text"
                    value={motifLiberation}
                    onChange={(e) => setMotifLiberation(e.target.value)}
                    className="demandes-form-input"
                    placeholder="Ex: Mutation, retraite..."
                  />
                </div>
                <div>
                  <label className="demandes-form-label">
                    Date de sortie souhaitée / réelle
                  </label>
                  <input
                    type="date"
                    value={dateSortieReelle}
                    onChange={(e) => setDateSortieReelle(e.target.value)}
                    className="demandes-form-input"
                  />
                  <p className="demandes-form-hint" style={{ marginTop: 4 }}>
                    Préremplie depuis l&apos;occupation. Vous pouvez la
                    modifier.
                  </p>
                </div>
                <div className="demandes-form-row">
                  <label className="demandes-checkbox-row">
                    <input
                      type="checkbox"
                      checked={clesRestituees}
                      onChange={(e) => setClesRestituees(e.target.checked)}
                    />
                    Clés restituées
                  </label>
                  <label className="demandes-checkbox-row">
                    <input
                      type="checkbox"
                      checked={procedureJudiciaire}
                      onChange={(e) =>
                        setProcedureJudiciaire(e.target.checked)
                      }
                    />
                    Procédure judiciaire
                  </label>
                </div>
              </div>
            )}

            {typeDemande === "BAIL" && (
              <div className="demandes-form-section">
                <div className="demandes-form-section-title">
                  Informations du contrat de bail
                </div>
                <div className="demandes-form-row">
                  <div>
                    <label className="demandes-form-label">Date début *</label>
                    <input
                      type="date"
                      required
                      value={dateDebutBail}
                      onChange={(e) => setDateDebutBail(e.target.value)}
                      className="demandes-form-input"
                    />
                  </div>
                  <div>
                    <label className="demandes-form-label">Durée (mois) *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={dureeBailMois}
                      onChange={(e) =>
                        setDureeBailMois(
                          e.target.value ? Number(e.target.value) : ""
                        )
                      }
                      className="demandes-form-input"
                      placeholder="Ex: 12"
                    />
                    <p className="demandes-form-hint" style={{ marginTop: 4 }}>
                      Sert uniquement au calcul de la date de fin (non
                      enregistrée en base).
                    </p>
                  </div>
                </div>
                <div>
                  <label className="demandes-form-label">
                    Date fin (calculée)
                  </label>
                  <input
                    type="date"
                    required
                    value={dateFinBail}
                    onChange={(e) => setDateFinBail(e.target.value)}
                    className="demandes-form-input"
                  />
                </div>
                <div>
                  <label className="demandes-form-label">
                    Montant loyer (Ar)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={montantLoyer}
                    onChange={(e) =>
                      setMontantLoyer(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    className="demandes-form-input"
                    placeholder="Ex: 450000"
                  />
                </div>
                <div
                  className="demandes-form-section-title"
                  style={{ marginTop: 14 }}
                >
                  Bailleur (si privé)
                </div>
                <div>
                  <label className="demandes-form-label">Nom du bailleur</label>
                  <input
                    type="text"
                    value={nomBailleur}
                    onChange={(e) => setNomBailleur(e.target.value)}
                    className="demandes-form-input"
                  />
                </div>
                <div className="demandes-form-row">
                  <div>
                    <label className="demandes-form-label">NIF</label>
                    <input
                      type="text"
                      value={nifBailleur}
                      onChange={(e) => setNifBailleur(e.target.value)}
                      className="demandes-form-input"
                    />
                  </div>
                  <div>
                    <label className="demandes-form-label">STAT</label>
                    <input
                      type="text"
                      value={statBailleur}
                      onChange={(e) => setStatBailleur(e.target.value)}
                      className="demandes-form-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="demandes-form-label">RIB</label>
                  <input
                    type="text"
                    value={ribBailleur}
                    onChange={(e) => setRibBailleur(e.target.value)}
                    className="demandes-form-input"
                  />
                </div>
              </div>
            )}

            {typeDemande === "ATTESTATION" && (
              <div className="demandes-form-section">
                <div className="demandes-form-section-title">Attestation</div>

                <div>
                  <label className="demandes-form-label">
                    Type d&apos;attestation *
                  </label>
                  <select
                    required
                    value={typeAttestation}
                    onChange={(e) =>
                      setTypeAttestation(
                        e.target.value as TypeAttestationLocal
                      )
                    }
                    className="demandes-form-input"
                  >
                    <option value="NON_LOGEMENT">
                      Attestation de non-logement
                    </option>
                    <option value="NON_OCCUPATION">
                      Attestation de non-occupation
                    </option>
                  </select>
                  <p className="demandes-form-hint" style={{ marginTop: 4 }}>
                    {typeAttestation === "NON_LOGEMENT"
                      ? "Le demandeur ne doit pas bénéficier d'un logement de fonction ou d'un bail actif."
                      : "Le demandeur ne doit occuper aucun bien du parc (logement ou bureau)."}
                  </p>
                </div>

                <div className="demandes-form-row">
                  <div>
                    <label className="demandes-form-label">Civilité</label>
                    <select
                      value={civiliteAttestation}
                      onChange={(e) => setCiviliteAttestation(e.target.value)}
                      className="demandes-form-input"
                    >
                      <option value="Monsieur">Monsieur</option>
                      <option value="Madame">Madame</option>
                    </select>
                  </div>
                  <div>
                    <label className="demandes-form-label">
                      N° d&apos;ordre officiel (ex: 404)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 404 (optionnel)"
                      value={numeroOrdre}
                      onChange={(e) => setNumeroOrdre(e.target.value)}
                      className="demandes-form-input"
                    />
                  </div>
                </div>

                <div className="demandes-form-row">
                  <div>
                    <label className="demandes-form-label">
                      Décret de nomination n°
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 2025-1346"
                      value={decretNumero}
                      onChange={(e) => setDecretNumero(e.target.value)}
                      className="demandes-form-input"
                    />
                  </div>
                  <div>
                    <label className="demandes-form-label">Date du décret</label>
                    <input
                      type="date"
                      value={decretDate}
                      onChange={(e) => setDecretDate(e.target.value)}
                      className="demandes-form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="demandes-form-label">
                    Date de prise de service
                  </label>
                  <input
                    type="date"
                    value={datePriseService}
                    onChange={(e) => setDatePriseService(e.target.value)}
                    className="demandes-form-input"
                  />
                  <p className="demandes-form-hint" style={{ marginTop: 4 }}>
                    Mentionné dans l&apos;attestation (&quot;date de sa prise de service, jusqu&apos;à ce jour&quot;).
                  </p>
                </div>

                <p className="demandes-form-hint">
                  Section 6.5.2 — Visa du supérieur et déclaration sur
                  l&apos;honneur légalisée (Annexe 39) obligatoires.
                </p>

                <div className="demandes-form-row">
                  <label className="demandes-checkbox-row">
                    <input
                      type="checkbox"
                      checked={visaSuperieur}
                      onChange={(e) => setVisaSuperieur(e.target.checked)}
                    />
                    Visa du supérieur hiérarchique *
                  </label>
                  <label className="demandes-checkbox-row">
                    <input
                      type="checkbox"
                      checked={declarationHonneurLegalisee}
                      onChange={(e) =>
                        setDeclarationHonneurLegalisee(e.target.checked)
                      }
                    />
                    Déclaration sur l&apos;honneur légalisée *
                  </label>
                </div>
              </div>
            )}

            {typeDemande === "RECENSEMENT" && (
              <div className="demandes-form-section">
                <div className="demandes-form-section-title">
                  Quitus / Recensement annuel
                </div>
                <div className="demandes-form-row">
                  <div>
                    <label className="demandes-form-label">Année *</label>
                    <input
                      type="number"
                      required
                      min={2000}
                      max={2100}
                      value={anneeRecensement}
                      onChange={(e) =>
                        setAnneeRecensement(Number(e.target.value))
                      }
                      className="demandes-form-input"
                    />
                  </div>
                  <div>
                    <label className="demandes-form-label">
                      État du bâtiment
                    </label>
                    <select
                      value={etatBatiment}
                      onChange={(e) =>
                        setEtatBatiment(
                          e.target.value as "BON" | "MOYEN" | "MAUVAIS"
                        )
                      }
                      className="demandes-form-input"
                    >
                      <option value="BON">Bon</option>
                      <option value="MOYEN">Moyen</option>
                      <option value="MAUVAIS">Mauvais</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="demandes-form-label">Observations</label>
                  <textarea
                    value={observationsQuitus}
                    onChange={(e) => setObservationsQuitus(e.target.value)}
                    rows={2}
                    className="demandes-form-textarea"
                    placeholder="Observations sur l'état du bien..."
                  />
                </div>
              </div>
            )}

            {typeDemande === "TRAVAUX" && (
              <div className="demandes-form-section">
                <div className="demandes-form-section-title">
                  Demande de travaux
                </div>
                <div>
                  <label className="demandes-form-label">
                    Type de travaux *
                  </label>
                  <select
                    required
                    value={typeTravaux}
                    onChange={(e) =>
                      setTypeTravaux(e.target.value as TypeTravaux)
                    }
                    className="demandes-form-input"
                  >
                    <option value="ENTRETIEN">Entretien</option>
                    <option value="REHABILITATION">Réhabilitation</option>
                    <option value="AMENAGEMENT">Aménagement</option>
                    <option value="CONSTRUCTION_NOUVELLE">
                      Construction nouvelle
                    </option>
                  </select>
                </div>
                <div className="demandes-form-row">
                  <div>
                    <label className="demandes-form-label">
                      Date début prévue
                    </label>
                    <input
                      type="date"
                      required
                      value={dateDebutTravaux}
                      onChange={(e) => setDateDebutTravaux(e.target.value)}
                      className="demandes-form-input"
                    />
                  </div>
                  <div>
                    <label className="demandes-form-label">
                      Date fin prévue
                    </label>
                    <input
                      type="date"
                      required
                      value={dateFinTravaux}
                      onChange={(e) => setDateFinTravaux(e.target.value)}
                      className="demandes-form-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="demandes-form-label">
                    Montant estimatif (Ar)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={montantEstimatif}
                    onChange={(e) =>
                      setMontantEstimatif(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    className="demandes-form-input"
                    placeholder="Ex: 2500000"
                  />
                </div>
              </div>
            )}

            {mode === "create" && (
              <div className="demandes-form-section">
                <div className="demandes-form-section-title">
                  Dossier scanné (pièce jointe)
                </div>
                <p className="demandes-form-hint">
                  Un seul fichier PDF ou image — max 10 Mo.
                </p>
                {scannedFile ? (
                  <div className="demandes-piece-row">
                    <span className="demandes-piece-filename">
                      {scannedFile.name}
                    </span>
                    <button
                      type="button"
                      className="demandes-btn-cancel"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => setScannedFile(null)}
                    >
                      Retirer
                    </button>
                  </div>
                ) : (
                  <label className="demandes-piece-upload-btn">
                    Choisir le fichier scanné
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/jpg"
                      hidden
                      onChange={(e) => {
                        setScannedFile(e.target.files?.[0] || null);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          <div className="demandes-form-actions">
            <button
              type="button"
              className="demandes-btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="demandes-btn-submit"
              disabled={
                saving ||
                loadingBiens ||
                loadingOccupants ||
                loadingOccupations
              }
            >
              {saving
                ? "Enregistrement..."
                : mode === "create"
                  ? "Soumettre la demande"
                  : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}