"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { Bail } from "../types";
import { ITEMS_PER_PAGE } from "../constants";
import { bauxApi } from "../api";
import { useFeedback } from "../../shared/feedback";

export type BailTab = "demandes" | "en_cours" | "historique";

const STATUTS_DEMANDES = [
  "EN_ATTENTE_MEF",
  "VISA_CF_SOUMIS",
  "VISA_CF_VALIDE",
] as const;

const STATUTS_EN_COURS = ["EN_COURS"] as const;

const STATUTS_HISTORIQUE = ["TERMINE", "RENOUVELE", "RESILIE"] as const;

function tabFilter(tab: BailTab, b: Bail): boolean {
  switch (tab) {
    case "demandes":
      return (STATUTS_DEMANDES as readonly string[]).includes(b.statut);
    case "en_cours":
      return (STATUTS_EN_COURS as readonly string[]).includes(b.statut);
    case "historique":
      return (STATUTS_HISTORIQUE as readonly string[]).includes(b.statut);
    default:
      return true;
  }
}

export function useBaux() {
  const { toast, confirmAction } = useFeedback();
  const [baux, setBaux] = useState<Bail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<BailTab>("demandes");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<Bail | null>(null);
  const [editing, setEditing] = useState<Bail | null>(null);

  const loadBaux = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bauxApi.getAll();
      setBaux(data);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Impossible de charger les baux";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBaux();
  }, [loadBaux]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return baux.filter((b) => {
      if (!tabFilter(activeTab, b)) return false;

      if (!q) return true;

      return (
        b.numeroBail.toLowerCase().includes(q) ||
        b.bienNumero.toLowerCase().includes(q) ||
        (b.bienNom || "").toLowerCase().includes(q) ||
        (b.locataireNom || "").toLowerCase().includes(q) ||
        (b.nomBailleur || "").toLowerCase().includes(q) ||
        (b.demandeReference || "").toLowerCase().includes(q) ||
        (b.statut || "").toLowerCase().includes(q)
      );
    });
  }, [baux, search, activeTab]);

  const counts = useMemo(
    () => ({
      demandes: baux.filter((b) => tabFilter("demandes", b)).length,
      en_cours: baux.filter((b) => tabFilter("en_cours", b)).length,
      historique: baux.filter((b) => tabFilter("historique", b)).length,
    }),
    [baux]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const current = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search]);

  const handleTabChange = useCallback((tab: BailTab) => {
    setActiveTab(tab);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleEdit = useCallback((b: Bail) => {
    setSelected(null);
    setEditing(b);
  }, []);

  const handleSaveEdit = useCallback(async (updated: Bail) => {
    try {
      const saved = await bauxApi.update(updated.numeroBail, updated);
      setBaux((prev) =>
        prev.map((b) => (b.numeroBail === saved.numeroBail ? saved : b))
      );
      setEditing(null);
      setSelected(saved);
      toast.success("Bail modifié", `Le bail ${saved.numeroBail} a été modifié.`);
    } catch (e: unknown) {
      toast.error(
        "Échec de la modification",
        e instanceof Error ? e.message : "Erreur lors de la modification"
      );
    }
  }, [toast]);

  const handleDelete = useCallback(async (b: Bail) => {
    if (!(await confirmAction({
      title: "Confirmer la suppression du bail",
      message: `Voulez-vous vraiment supprimer le bail « ${b.numeroBail} » ? Cette action est irréversible.`,
      confirmLabel: "Supprimer le bail",
      type: "danger",
    }))) {
      return;
    }
    try {
      await bauxApi.remove(b.numeroBail);
      setBaux((prev) => prev.filter((x) => x.numeroBail !== b.numeroBail));
      setSelected(null);
      toast.success("Bail supprimé", `Le bail ${b.numeroBail} a été supprimé.`);
    } catch (e: unknown) {
      toast.error(
        "Échec de la suppression",
        e instanceof Error ? e.message : "Erreur lors de la suppression"
      );
    }
  }, [confirmAction, toast]);

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
    editing,
    loadBaux,
    setCurrentPage,
    setSelected,
    setEditing,
    handleTabChange,
    handleSearchChange,
    handleEdit,
    handleSaveEdit,
    handleDelete,
  };
}