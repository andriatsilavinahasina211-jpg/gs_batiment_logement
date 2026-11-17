"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./RecensementPage.css";

import type {
  CampagneRecensement,
  Quitus,
  CreateCampagnePayload,
  CreateQuitusPayload,
} from "./types";
import { recensementApi } from "./api";
import { getStoredUser } from "../../lib/auth";
import { useFeedback } from "../shared/feedback";
import { imprimerQuitus } from "./ImprimerQuitus";
import { demandeApi } from "../demandes/services/demandeApi";
import type { Demande } from "../demandes/types/demande";

/** Prévient le menu latéral et la cloche qu'il y a du nouveau (compteurs). */
function rafraichirNotifications() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("nav:refresh"));
  }
}

import CampagneBanner from "./components/CampagneBanner";
import CampagneFormModal from "./components/CampagneFormModal";
import QuitusFilters from "./components/QuitusFilters";
import QuitusTable from "./components/QuitusTable";
import QuitusDetailModal from "./components/QuitusDetailModal";
import QuitusFormModal from "./components/QuitusFormModal";

const ITEMS_PER_PAGE = 10;

function getInfosRecensement(demande: Demande): { annee?: number; etatBatiment?: string } {
  const marker = "[DONNEES_METIER]";
  const index = demande.description?.indexOf(marker) ?? -1;
  if (index < 0 || !demande.description) return {};

  try {
    const data = JSON.parse(demande.description.slice(index + marker.length).trim());
    return data?.quitus ?? {};
  } catch {
    return {};
  }
}

const statutDemandeLabels: Record<string, string> = {
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  VALIDEE: "Validée",
  REJETEE: "Rejetée",
  TERMINEE: "Terminée",
};

export default function RecensementPage() {
  const { toast, confirmAction } = useFeedback();

  // ── Utilisateur connecté ────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (u) setCurrentUser(u);
  }, []);

  const canManage =
    currentUser?.role === "CHEF_SRB" || currentUser?.role === "ADMINISTRATEUR";

  // ── Données ─────────────────────────────────────────────────────────
  const [campagnes, setCampagnes] = useState<CampagneRecensement[]>([]);
  const [activeCampagne, setActiveCampagne] = useState<CampagneRecensement | null>(null);
  const [quitusList, setQuitusList] = useState<Quitus[]>([]);
  const [demandesRecensement, setDemandesRecensement] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filtres & Pagination ────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<string>("TOUS");
  const [filtreAnnee, setFiltreAnnee] = useState<string>("TOUS");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Modales ─────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Quitus | null>(null);
  const [showCreateQuitus, setShowCreateQuitus] = useState(false);
  const [showCreateCampagne, setShowCreateCampagne] = useState(false);
  // Dernier quitus validé, prêt à être imprimé
  const [quitusAImprimer, setQuitusAImprimer] = useState<Quitus | null>(null);

  // ── Chargement des données backend ──────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cList, qList, demandes] = await Promise.all([
        recensementApi.getCampagnes(),
        recensementApi.getAllQuitus(),
        demandeApi.getAll().catch((err) => {
          console.error("Erreur chargement des demandes de recensement:", err);
          return [];
        }),
      ]);

      setCampagnes(cList);
      setQuitusList(qList);
      setDemandesRecensement(demandes.filter((d) => d.typeDemande === "RECENSEMENT"));

      // Déterminer la campagne active : priorité à celle qui est OUVERTE, sinon la plus récente
      setActiveCampagne((prev) => {
        if (prev) {
          const found = cList.find((c) => c.id === prev.id);
          if (found) return found;
        }
        const ouverte = cList.find((c) => c.statut === "OUVERTE");
        return ouverte || cList[0] || null;
      });
    } catch (err: any) {
      console.error("Erreur chargement recensement:", err);
      setError(err.message || "Impossible de charger les données de recensement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Liste des années pour le filtre ─────────────────────────────────
  const annees = useMemo(() => {
    const set = new Set<number>();
    campagnes.forEach((c) => set.add(c.annee));
    quitusList.forEach((q) => set.add(q.annee));
    return Array.from(set).sort((a, b) => b - a);
  }, [campagnes, quitusList]);

  // ── Filtrage des quitus ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    return quitusList.filter((q) => {
      const s = search.toLowerCase();
      const bienNom = (q.bien?.nomDuBien || "").toLowerCase();
      const occupantNom = q.occupant
        ? `${q.occupant.nom} ${q.occupant.prenom}`.toLowerCase()
        : "";

      const matchSearch =
        !search.trim() ||
        q.reference.toLowerCase().includes(s) ||
        q.bienNumero.toLowerCase().includes(s) ||
        bienNom.includes(s) ||
        occupantNom.includes(s);

      const matchStatut = filtreStatut === "TOUS" || q.statut === filtreStatut;
      const matchAnnee =
        filtreAnnee === "TOUS" || q.annee === Number(filtreAnnee);

      return matchSearch && matchStatut && matchAnnee;
    });
  }, [quitusList, search, filtreStatut, filtreAnnee]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const current = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // ── Actions Campagne ────────────────────────────────────────────────
  const handleCreateCampagne = async (payload: CreateCampagnePayload) => {
    try {
      const created = await recensementApi.createCampagne(payload);
      toast.success(
        "Campagne créée",
        `La campagne de recensement ${created.annee} a été ouverte avec succès.`
      );
      rafraichirNotifications();
      await loadData();
      setActiveCampagne(created);
    } catch (err: any) {
      toast.error("Erreur de création", err.message);
      throw err;
    }
  };

  const handleCloturerCampagne = async (id: string) => {
    const ok = await confirmAction({
      title: "Clôturer la campagne de recensement",
      message:
        "Êtes-vous sûr de vouloir clôturer cette campagne ? Aucun nouveau quitus ne pourra y être rattaché.",
      confirmLabel: "Clôturer définitivement",
      type: "warning",
    });

    if (!ok) return;

    try {
      await recensementApi.cloturerCampagne(id);
      toast.success("Campagne clôturée", "La campagne a été clôturée.");
      rafraichirNotifications();
      await loadData();
    } catch (err: any) {
      toast.error("Échec de la clôture", err.message);
    }
  };

  // ── Actions Quitus ──────────────────────────────────────────────────
  const handleCreateQuitus = async (payload: CreateQuitusPayload) => {
    try {
      const created = await recensementApi.createQuitus(payload);
      toast.success(
        "Quitus enregistré",
        `Quitus ${created.reference} créé avec succès pour le bien ${payload.bienNumero}.`
      );
      rafraichirNotifications();
      await loadData();
      setCurrentPage(1);
    } catch (err: any) {
      toast.error("Erreur lors de l'enregistrement", err.message);
      throw err;
    }
  };

  const handleValiderQuitus = async (id: string) => {
    const ok = await confirmAction({
      title: "Valider le quitus",
      message:
        "Confirmez-vous la conformité de ce quitus de recensement ? Son statut passera en VALIDÉ.",
      confirmLabel: "Valider le quitus",
      type: "info",
    });

    if (!ok) return;

    try {
      const resultat: any = await recensementApi.validerQuitus(id);
      toast.success("Quitus validé", "Le quitus a été validé. Le document officiel s'ouvre pour impression.");
      rafraichirNotifications();

      // Quitus à jour : celui renvoyé par le serveur, sinon celui de la liste
      const base = quitusList.find((q) => q.id === id) || selected;
      const valide: Quitus | null =
        resultat && resultat.id
          ? ({ ...base, ...resultat, statut: "VALIDE" } as Quitus)
          : base
          ? ({ ...base, statut: "VALIDE", dateValidation: new Date().toISOString() } as any)
          : null;

      if (valide) {
        setQuitusAImprimer(valide);
        imprimerQuitus(valide, () =>
          toast.warning(
            "Fenêtre bloquée",
            "Autorisez les fenêtres pop-up pour ouvrir l’aperçu du quitus."
          )
        );
      }

      await loadData();
      if (selected && selected.id === id) {
        setSelected((prev) => (prev ? { ...prev, statut: "VALIDE" } : null));
      }
    } catch (err: any) {
      toast.error("Erreur de validation", err.message);
    }
  };

  return (
    <div className="recensement-page">
      {/* En-tête */}
      <div className="recensement-header">
        <div>
          <h2>Recensement annuel des biens</h2>
          <p>
            {filtered.length} quitus recensé{filtered.length > 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="recensement-btn-secondary"
            onClick={loadData}
            title="Rafraîchir les données"
          >
            ↻ Actualiser
          </button>
          <button
            type="button"
            className="recensement-btn-primary"
            disabled={!activeCampagne || activeCampagne.statut !== "OUVERTE"}
            onClick={() => setShowCreateQuitus(true)}
            title={
              !activeCampagne || activeCampagne.statut !== "OUVERTE"
                ? "Une campagne doit être ouverte pour créer un quitus"
                : "Créer un nouveau quitus"
            }
          >
            + Nouveau quitus
          </button>
        </div>
      </div>

      {/* Bannière de la campagne */}
      <CampagneBanner
        campagnes={campagnes}
        activeCampagne={activeCampagne}
        onSelectCampagne={(c) => {
          setActiveCampagne(c);
          setFiltreAnnee(String(c.annee));
        }}
        onNewCampagne={() => setShowCreateCampagne(true)}
        onCloturer={handleCloturerCampagne}
        canManage={canManage}
      />

      {/* Quitus validé : bouton pour (ré)imprimer le document officiel */}
      {quitusAImprimer && (
        <div
          style={{
            padding: "12px 16px",
            background: "#dcfce7",
            color: "#166534",
            borderRadius: 10,
            fontSize: 13,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>
            Quitus <strong>{quitusAImprimer.reference}</strong> validé. Choisissez
            « Enregistrer en PDF » dans la fenêtre d'impression pour le télécharger.
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="recensement-btn-primary"
              onClick={() =>
                imprimerQuitus(quitusAImprimer, () =>
                  toast.warning(
                    "Fenêtre bloquée",
                    "Autorisez les fenêtres pop-up pour ouvrir l’aperçu du quitus."
                  )
                )
              }
            >
              🖨 Imprimer / PDF
            </button>
            <button
              type="button"
              className="recensement-btn-secondary"
              onClick={() => setQuitusAImprimer(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Message d'erreur s'il y a lieu */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "#fee2e2",
            color: "#dc2626",
            borderRadius: 10,
            fontSize: 13,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={loadData}
            style={{
              background: "transparent",
              border: "1px solid #dc2626",
              color: "#dc2626",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Filtres de recherche */}
      <QuitusFilters
        search={search}
        filtreAnnee={filtreAnnee}
        filtreStatut={filtreStatut}
        annees={annees}
        onSearchChange={(v) => {
          setSearch(v);
          setCurrentPage(1);
        }}
        onAnneeChange={(v) => {
          setFiltreAnnee(v);
          setCurrentPage(1);
        }}
        onStatutChange={(v) => {
          setFiltreStatut(v);
          setCurrentPage(1);
        }}
      />

      {/* Tableau des quitus */}
      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          Chargement des données de recensement depuis le serveur...
        </div>
      ) : (
        <>
          <QuitusTable
            quitus={current}
            onSelect={(q) => setSelected(q)}
            onValider={(q) => handleValiderQuitus(q.id)}
            canValider={canManage}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="recensement-pagination">
              <button
                type="button"
                className="recensement-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  type="button"
                  key={p}
                  className={`recensement-page-num${p === currentPage ? " active" : ""}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="recensement-page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant →
              </button>
            </div>
          )}

          <div className="recensement-pagination-info">
            Page {currentPage} sur {totalPages} — Affichage de {startIndex + 1} à{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} sur{" "}
            {filtered.length}
          </div>
        </>
      )}

      {/* Modal Détail du Quitus */}
      {selected && selected.statut === "VALIDE" && (
        <button
          type="button"
          className="recensement-btn-primary"
          onClick={() =>
            imprimerQuitus(selected, () =>
              toast.warning(
                "Fenêtre bloquée",
                "Autorisez les fenêtres pop-up pour ouvrir l’aperçu du quitus."
              )
            )
          }
          style={{ position: "fixed", bottom: 24, right: 24, zIndex: 10000 }}
        >
          🖨 Imprimer le quitus
        </button>
      )}
      {selected && (
        <QuitusDetailModal
          quitus={selected}
          onClose={() => setSelected(null)}
          onValider={handleValiderQuitus}
          canValider={canManage}
        />
      )}

      {/* Modal Création Quitus */}
      {showCreateQuitus && activeCampagne && (
        <QuitusFormModal
          campagne={activeCampagne}
          onClose={() => setShowCreateQuitus(false)}
          onSave={handleCreateQuitus}
        />
      )}

      {/* Modal Création Campagne */}
      {showCreateCampagne && (
        <CampagneFormModal
          onClose={() => setShowCreateCampagne(false)}
          onSave={handleCreateCampagne}
        />
      )}
    </div>
  );
}