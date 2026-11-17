"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import "./PiecesJointesPage.css";
import { useFeedback } from "../shared/feedback";
import { piecesApi, type PieceJointe } from "./services/piecesApi"; // adaptez le chemin : "./services/piecesApi" si le fichier est local
// adaptez le chemin : "./services/piecesApi" si le fichier est local

/* ── Types de pièces (alignés demandes occupation / libération + legacy) ── */
const TYPE_PIECE_LABEL: Record<string, string> = {
  DEMANDE_MANUSCRITE: "Demande signée",
  ACTE_NOMINATION: "Acte de nomination",
  CNI: "CNI",
  ATTESTATION_NON_LOGEMENT: "Attestation non-logement",
  DEMANDE_LIBERATION: "Demande de libération",
  ACTE_MUTATION: "Acte de mutation",
  ETAT_DES_LIEUX_SORTIE: "EDL sortie",
  RECU_CLES: "Reçu des clés",
  CISJ: "CISJ",
  PHOTO: "Photo",
  DEVIS: "Devis",
  CONTRAT: "Contrat",
  ETAT_LIEUX: "État des lieux",
  NIF: "NIF",
  STAT: "STAT",
  AUTRE: "Autre",
};

const ITEMS_PER_PAGE = 10;

const fileIcon = (mime?: string | null, nom?: string) => {
  const m = (mime || "").toLowerCase();
  const n = (nom || "").toLowerCase();
  if (m.includes("pdf") || n.endsWith(".pdf")) return "📄";
  if (m.includes("image") || /\.(jpg|jpeg|png|webp|gif)$/.test(n)) return "🖼️";
  if (m.includes("word") || n.endsWith(".doc") || n.endsWith(".docx")) return "📝";
  if (m.includes("sheet") || n.endsWith(".xls") || n.endsWith(".xlsx")) return "📊";
  return "📎";
};

const formatSize = (bytes?: number | null) => {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
};

type PieceJointeAvecMeta = PieceJointe & {
  bienNumero?: string | null;
  bailNumero?: string | null;
  travauxId?: string | null;
  dateEmission?: string | null;
  createdAt?: string | null;
  valide?: boolean;
};

const buildPieceUrl = (url?: string | null) => {
  if (!url) return "#";
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanUrl}`;
};

const lienLie = (doc: PieceJointe) => {
  const data = doc as PieceJointeAvecMeta;
  if (data.demandeRef) return `Demande ${data.demandeRef}`;
  if (data.bienNumero) return `Bien ${data.bienNumero}`;
  if (data.bailNumero) return `Bail ${data.bailNumero}`;
  if (data.travauxId) return `Travaux ${data.travauxId}`;
  return "—";
};

const labelType = (t?: string | null) =>
  t ? TYPE_PIECE_LABEL[t] || t : "—";

const pieceValide = (piece: PieceJointe) =>
  (piece as PieceJointeAvecMeta).valide !== false;

/* ── Formulaire création (lié à une demande) ── */
function PieceJointeForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [demandeRef, setDemandeRef] = useState("");
  const [typePiece, setTypePiece] = useState("AUTRE");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!demandeRef.trim()) {
      setError("La référence de la demande est obligatoire (ex: DEM-xxxx).");
      return;
    }
    if (!file) {
      setError("Sélectionnez un fichier.");
      return;
    }
    setSaving(true);
    try {
      await piecesApi.upload({
        file,
        typePiece,
        demandeRef: demandeRef.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur d'upload");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pj-modal-overlay form" onClick={onClose}>
      <div className="pj-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pj-form-header">
          <h2>Ajouter une pièce jointe</h2>
          <button type="button" className="pj-form-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pj-form-body">
          {error && (
            <div className="pj-form-error" style={{ color: "#dc2626", marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div className="pj-form-fields">
            <div>
              <label className="pj-form-label">Réf. Demande *</label>
              <input
                type="text"
                required
                value={demandeRef}
                onChange={(e) => setDemandeRef(e.target.value)}
                className="pj-form-input"
                placeholder="DEM-2026-0001"
              />
              <p className="pj-form-hint" style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                Les pièces sont toujours rattachées à une demande.
              </p>
            </div>

            <div>
              <label className="pj-form-label">Type de pièce</label>
              <select
                value={typePiece}
                onChange={(e) => setTypePiece(e.target.value)}
                className="pj-form-input"
              >
                {Object.entries(TYPE_PIECE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="pj-upload-zone"
              onClick={() => fileRef.current?.click()}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {file?.name || "Cliquez pour sélectionner un fichier"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                PDF, JPG, PNG — max 10 Mo
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/jpg"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div className="pj-form-actions">
            <button
              type="button"
              className="pj-btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </button>
            <button type="submit" className="pj-btn-submit" disabled={saving}>
              {saving ? "Envoi..." : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Détail ── */
function PieceJointeDetail({
  piece,
  onClose,
  onDelete,
}: {
  piece: PieceJointeAvecMeta;
  onClose: () => void;
  onDelete: (p: PieceJointe) => void;
}) {
  return (
    <div className="pj-modal-overlay" onClick={onClose}>
      <div className="pj-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pj-detail-header">
          <div>
            <h2>{piece.nomFichier}</h2>
            <p>
              {labelType(piece.typePiece)} · {formatSize(piece.taille)}
            </p>
          </div>
          <button type="button" className="pj-detail-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="pj-detail-body">
          <div className="pj-detail-infos">
            <div className="pj-info-row">
              <span className="pj-info-label">Validité</span>
              <span
                className="pj-badge"
                style={{
                  background: pieceValide(piece) ? "var(--green-bg, #dcfce7)" : "var(--red-bg, #fee2e2)",
                  color: pieceValide(piece) ? "var(--green, #16a34a)" : "var(--red, #dc2626)",
                }}
              >
                {pieceValide(piece) ? "Valide" : "Invalide"}
              </span>
            </div>
            <div className="pj-info-row">
              <span className="pj-info-label">Type</span>
              <span className="pj-info-value">{labelType(piece.typePiece)}</span>
            </div>
            <div className="pj-info-row">
              <span className="pj-info-label">Taille</span>
              <span className="pj-info-value">{formatSize(piece.taille)}</span>
            </div>
            <div className="pj-info-row">
              <span className="pj-info-label">Type MIME</span>
              <span className="pj-info-value">{piece.typeMime || "—"}</span>
            </div>
            <div className="pj-info-row">
              <span className="pj-info-label">Date émission</span>
              <span className="pj-info-value">{formatDate(piece.dateEmission)}</span>
            </div>
            <div className="pj-info-row">
              <span className="pj-info-label">Date ajout</span>
              <span className="pj-info-value">{formatDate(piece.createdAt)}</span>
            </div>
            <div className="pj-info-row">
              <span className="pj-info-label">Lié à</span>
              <span className="pj-info-value">{lienLie(piece)}</span>
            </div>
          </div>

          <div className="pj-detail-actions">
            <a
              className="pj-btn-secondary"
              href={buildPieceUrl(piece.url)}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir / Télécharger
            </a>
            <button
              type="button"
              className="pj-btn-danger"
              onClick={() => onDelete(piece)}
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function PiecesJointesPage() {
  const { toast, confirmAction } = useFeedback();

  const [list, setList] = useState<PieceJointe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filtreType, setFiltreType] = useState("TOUS");
  const [filtreValide, setFiltreValide] = useState("TOUS");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<PieceJointe | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await piecesApi.getAll();
      setList(data);
    } catch (err: any) {
      setError(err.message || "Erreur de chargement");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return list.filter((d) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search.trim() ||
        d.nomFichier.toLowerCase().includes(q) ||
        (d.bienNumero || "").toLowerCase().includes(q) ||
        (d.demandeRef || "").toLowerCase().includes(q) ||
        (d.bailNumero || "").toLowerCase().includes(q) ||
        (d.travauxId || "").toLowerCase().includes(q);

      const matchType = filtreType === "TOUS" || d.typePiece === filtreType;
      const matchValide =
        filtreValide === "TOUS" ||
        (filtreValide === "OUI" && pieceValide(d)) ||
        (filtreValide === "NON" && !pieceValide(d));

      return matchSearch && matchType && matchValide;
    });
  }, [list, search, filtreType, filtreValide]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const start = (page - 1) * ITEMS_PER_PAGE;
  const current = filtered.slice(start, start + ITEMS_PER_PAGE);

  const handleDelete = async (p: PieceJointe) => {
    if (
      !(await confirmAction({
        title: "Confirmer la suppression",
        message: `Vous êtes sur le point de supprimer définitivement le fichier « ${p.nomFichier} ». Cette action est irréversible.`,
        confirmLabel: "Supprimer",
        type: "warning",
      }))
    )
      return;
    try {
      await piecesApi.remove(p.id);
      setSelected(null);
      await load();
      toast.success("Fichier supprimé", `Le fichier ${p.nomFichier} a été supprimé avec succès.`);
    } catch (err: any) {
      toast.error("Échec de la suppression", err.message || "Le fichier n'a pas pu être supprimé.");
    }
  };

  return (
    <div className="pj-page">
      <div className="pj-header">
        <div>
          <h2>Pièces jointes</h2>
          <p>
            {loading
              ? "Chargement..."
              : `${filtered.length} pièce${filtered.length > 1 ? "s" : ""} jointe${filtered.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          type="button"
          className="pj-btn-primary"
          onClick={() => setShowCreate(true)}
        >
          + Ajouter
        </button>
      </div>

      <div className="pj-filters">
        <div className="pj-search">
          <input
            type="text"
            placeholder="Rechercher par nom, bien, demande, bail..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="pj-select"
          value={filtreType}
          onChange={(e) => {
            setFiltreType(e.target.value);
            setPage(1);
          }}
        >
          <option value="TOUS">Tous les types</option>
          {Object.entries(TYPE_PIECE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className="pj-select"
          value={filtreValide}
          onChange={(e) => {
            setFiltreValide(e.target.value);
            setPage(1);
          }}
        >
          <option value="TOUS">Tous</option>
          <option value="OUI">Valides</option>
          <option value="NON">Invalides</option>
        </select>
      </div>

      {error && (
        <div style={{ color: "#dc2626", marginBottom: 12 }}>
          {error}{" "}
          <button type="button" className="pj-btn-secondary" onClick={load}>
            Réessayer
          </button>
        </div>
      )}

      {loading ? (
        <div className="pj-empty">Chargement des pièces jointes…</div>
      ) : current.length === 0 ? (
        <div className="pj-empty">Aucune pièce jointe trouvée.</div>
      ) : (
        <>
          <div className="pj-table-wrap">
            <table className="pj-table">
              <thead>
                <tr>
                  <th>Fichier</th>
                  <th>Type</th>
                  <th>Taille</th>
                  <th>Lié à</th>
                  <th>Date émission</th>
                  <th>Validité</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {current.map((d) => (
                  <tr key={d.id} onClick={() => setSelected(d)}>
                    <td>
                      <div className="pj-file-cell">
                        <div className="pj-file-icon">
                          {fileIcon(d.typeMime, d.nomFichier)}
                        </div>
                        <span className="pj-td-strong">{d.nomFichier}</span>
                      </div>
                    </td>
                    <td>
                      <span className="pj-type-badge">{labelType(d.typePiece)}</span>
                    </td>
                    <td className="pj-td-muted">{formatSize(d.taille)}</td>
                    <td className="pj-td-muted">{lienLie(d)}</td>
                    <td className="pj-td-muted">{formatDate(d.dateEmission)}</td>
                    <td>
                      <span
                        className="pj-badge"
                        style={{
                          background:
                            pieceValide(d)
                              ? "var(--green-bg, #dcfce7)"
                              : "var(--red-bg, #fee2e2)",
                          color:
                            pieceValide(d)
                              ? "var(--green, #16a34a)"
                              : "var(--red, #dc2626)",
                        }}
                      >
                        {pieceValide(d) ? "Valide" : "Invalide"}
                      </span>
                    </td>
                    <td>
                      <div
                        className="pj-td-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          className="pj-btn-icon"
                          href={piecesApi.fileUrl(d.url)}
                          target="_blank"
                          rel="noreferrer"
                          title="Ouvrir"
                        >
                          ↗
                        </a>
                        <button
                          type="button"
                          className="pj-btn-icon danger"
                          title="Supprimer"
                          onClick={() => handleDelete(d)}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pj-pagination">
              <button
                type="button"
                className="pj-page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`pj-page-num${p === page ? " active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="pj-page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Suivant →
              </button>
            </div>
          )}

          <div className="pj-pagination-info">
            Page {page} sur {totalPages} — {start + 1}–
            {Math.min(start + ITEMS_PER_PAGE, filtered.length)} sur{" "}
            {filtered.length}
          </div>
        </>
      )}

      {selected && (
        <PieceJointeDetail
          piece={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
        />
      )}

      {showCreate && (
        <PieceJointeForm
          onClose={() => setShowCreate(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}