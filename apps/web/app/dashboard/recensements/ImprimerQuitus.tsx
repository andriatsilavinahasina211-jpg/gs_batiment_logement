import { generateQuitusTemplate, type QuitusTemplateData } from "./templates/quitus.template"; // adaptez le chemin si besoin
import type { Quitus } from "./types";

/**
 * Ouvre une fenêtre d’aperçu du quitus officiel.
 * L’utilisateur vérifie le document puis peut l’imprimer / enregistrer en PDF.
 */
export function imprimerQuitus(quitus: Quitus, onPopupBlocked: () => void) {
  // ── Construction du nom du déposant ────────────────────────────────
  const nomResponsable = quitus.occupant
    ? `${quitus.occupant.prenom || ""} ${quitus.occupant.nom || ""}`.trim()
    : quitus.createdBy
    ? `${quitus.createdBy.prenom || ""} ${quitus.createdBy.nom || ""}`.trim()
    : "";

  // ── Designation des bureaux / biens ────────────────────────────────
  // On privilégie le snapshot s’il existe (données figées à la validation)
  const snapshot = quitus.donneesSnapshot || {};

  const designationBureau =
    snapshot.designationBureau ||
    snapshot.bureaux ||
    (quitus.bien?.nomDuBien
      ? `Un (01) bureau : ${quitus.bien.nomDuBien}`
      : quitus.bienNumero
      ? `Bien n° ${quitus.bienNumero}`
      : "");

  const nomPropriete =
    snapshot.nomPropriete ||
    snapshot.propriete ||
    quitus.bien?.nomDuBien ||
    "";

  const titreFoncier =
    snapshot.titreFoncier ||
    snapshot.titre ||
    "";

  const superficie =
    snapshot.superficie ||
    "";

  const adresseBien =
    snapshot.adresse ||
    quitus.bien?.adresse ||
    "";

  // ── Données pour le template ───────────────────────────────────────
  const data: QuitusTemplateData = {
    numeroQuitus: quitus.reference || "",
    annee: quitus.annee,

    // En-tête administratif (valeurs par défaut = norme Haute Matsiatra)
    region: "HAUTE MATSIATRA",
    ville: "FIANARANTSOA",

    nomResponsable,
    fonctionResponsable: snapshot.fonctionResponsable || "",
    nomService: snapshot.nomService || "",

    designationBureau,
    nomPropriete,
    titreFoncier,
    superficie,
    adresseBien,

    observations: quitus.observations || snapshot.observations || "",

    // Date de validation ou de création
    dateEmission: quitus.createdAt || new Date().toISOString(),

    nomSignataire: "", // laissé vide (sera signé manuellement)
    fonctionSignataire: "LE CHEF DU SERVICE RÉGIONAL DU BUDGET",
  };

  const html = generateQuitusTemplate(data);

  // ── Ouverture de la fenêtre d’aperçu ───────────────────────────────
  const win = window.open("", "_blank", "width=900,height=1200,scrollbars=yes");

  if (!win) {
    onPopupBlocked();
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
}