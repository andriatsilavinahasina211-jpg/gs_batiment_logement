"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { Occupation } from "../../occupations/types";
import { ITEMS_PER_PAGE } from "../../occupations/constants";
import { occupationsApi } from "../../occupations/api";
import {
  STATUTS_LIBERATION,
  type Tab,
  tabFilter,
} from "../constants";
import { useFeedback } from "../../shared/feedback";

export function useLiberations() {
  const { toast, confirmAction } = useFeedback();
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("demandes");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selected, setSelected] = useState<Occupation | null>(null);
  const [liberationTarget, setLiberationTarget] = useState<{
    occupation: Occupation;
    mode: "demander" | "valider";
  } | null>(null);
  const [refusingId, setRefusingId] = useState<string | null>(null);

  const loadOccupations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await occupationsApi.getAll();
      setOccupations(
        all.filter((o) =>
          (STATUTS_LIBERATION as readonly string[]).includes(o.statut)
        )
      );
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Impossible de charger les données";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOccupations();
  }, [loadOccupations]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return occupations.filter((o) => {
      if (!tabFilter(activeTab, o)) return false;
      if (!q) return true;
      return (
        o.numeroOccupation.toLowerCase().includes(q) ||
        o.bienNumero.toLowerCase().includes(q) ||
        (o.bienNom || "").toLowerCase().includes(q) ||
        (o.occupantNom || "").toLowerCase().includes(q) ||
        (o.motifLiberation || "").toLowerCase().includes(q) ||
        (o.demandeReference || "").toLowerCase().includes(q)
      );
    });
  }, [occupations, search, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const current = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const counts = useMemo(
    () => ({
      demandes: occupations.filter((o) => o.statut === "DEMANDE_LIBERATION")
        .length,
      en_cours: occupations.filter((o) =>
        ["EN_COURS", "APPROUVE", "FIN_PROCHE"].includes(o.statut)
      ).length,
      historique: occupations.filter(
        (o) => o.statut === "LIBERATION_VALIDEE" || o.statut === "LIBERE"
      ).length,
    }),
    [occupations]
  );

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearch("");
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, []);

  const handleRefuser = useCallback(
    async (o: Occupation) => {
      const confirmed = await confirmAction({
        title: "Refuser la libération",
        message: `Confirmez-vous le refus de la demande de libération « ${o.numeroOccupation} » ?`,
        confirmLabel: "Refuser la libération",
        type: "danger",
      });
      if (!confirmed) {
        return;
      }
      setRefusingId(o.numeroOccupation);
      try {
        await occupationsApi.refuserLiberation(o.numeroOccupation);
        await loadOccupations();
        toast.success(
          "Libération refusée",
          `La demande concernant ${o.numeroOccupation} a été refusée.`
        );
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Erreur lors du refus";
        toast.error("Échec du refus", message);
      } finally {
        setRefusingId(null);
      }
    },
    [confirmAction, loadOccupations, toast]
  );

  const openDemander = useCallback((o: Occupation) => {
    setLiberationTarget({ occupation: o, mode: "demander" });
  }, []);

  const openValider = useCallback((o: Occupation) => {
    setLiberationTarget({ occupation: o, mode: "valider" });
  }, []);

  const closeLiberationForm = useCallback(() => {
    setLiberationTarget(null);
  }, []);

  const handleLiberationSuccess = useCallback(async () => {
    setLiberationTarget(null);
    await loadOccupations();
  }, [loadOccupations]);

  return {
    loading,
    error,
    current,
    filtered,
    counts,
    totalPages,
    activeTab,
    search,
    currentPage,
    selected,
    liberationTarget,
    refusingId,
    loadOccupations,
    handleTabChange,
    handleSearchChange,
    setCurrentPage,
    setSelected,
    openDemander,
    openValider,
    handleRefuser,
    closeLiberationForm,
    handleLiberationSuccess,
  };
}