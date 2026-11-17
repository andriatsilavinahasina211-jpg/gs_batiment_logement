import type { Analyse, Indicateurs } from "../ia/iaapi";

// ==========================================
// TYPES
// ==========================================

export type Priorite = "HAUTE" | "MOYENNE" | "BASSE";

export interface Recommandation {
  id: string;
  titre: string;
  description: string;
  priorite: Priorite;
  domaine: string;
  nombre: number;
  actionSuggeree: string;
  details: string[];
}

export interface AlerteUI {
  id: string;
  titre: string;
  description: string;
  niveau: "critique" | "attention" | "info";
  icon: string;
}

export interface Contexte {
  indicateurs: Indicateurs | null;
  analyse: Analyse | null;
  /** true si l'analyse détaillée est refusée (rôle Agent) */
  analyseRestreinte: boolean;
}

const plur = (n: number, singulier: string, pluriel = `${singulier}s`) =>
  n > 1 ? pluriel : singulier;

const ORDRE_PRIORITE: Record<Priorite, number> = {
  HAUTE: 0,
  MOYENNE: 1,
  BASSE: 2,
};

// ==========================================
// RECOMMANDATIONS (générées depuis /dashboard/ia/analyse)
// ==========================================

export function buildRecommandations(a: Analyse): Recommandation[] {
  const recos: Recommandation[] = [];
  const { anomalies, alertes } = a;
  const annee = new Date().getFullYear();

  const doublons = anomalies.doublonsAvantageLogement;
  if (doublons.length > 0) {
    recos.push({
      id: "doublons",
      titre: `${doublons.length} ${plur(doublons.length, "doublon")} d'avantage logement à régulariser`,
      description:
        "Des occupants cumulent un logement de fonction et un bail actif, ce qui viole le principe d'unicité de l'avantage logement.",
      priorite: "HAUTE",
      domaine: "Réglementation",
      nombre: doublons.length,
      actionSuggeree:
        "Régulariser chaque cumul sans attendre : libération du logement ou résiliation du bail.",
      details: doublons.map(
        (d) => `${d.occupant} — occupation ${d.occupationRef}, bail ${d.bailRef}`
      ),
    });
  }

  const sansTitre = anomalies.occupantsSansTitre;
  if (sansTitre.length > 0) {
    recos.push({
      id: "sans-titre",
      titre: `${sansTitre.length} ${plur(sansTitre.length, "occupation")} sans titre légal`,
      description:
        "Des biens sont occupés sans titre. Une procédure de libération ou une procédure judiciaire doit être engagée.",
      priorite: "HAUTE",
      domaine: "Occupation",
      nombre: sansTitre.length,
      actionSuggeree:
        "Initier la procédure de libération ou la procédure judiciaire pour chaque occupation.",
      details: sansTitre.map((o) => `${o.bienNom} — ${o.occupant}`),
    });
  }

  const sansQuitusN1 = anomalies.travauxSansQuitus;
  if (sansQuitusN1.length > 0) {
    recos.push({
      id: "sans-quitus-n1",
      titre: `${sansQuitusN1.length} ${plur(sansQuitusN1.length, "chantier")} sans quitus N-1`,
      description:
        "Travaux initiés sans quitus de recensement N-1, non conformes à la Circulaire N°813-MFB/SG/DGB/DPE/SLA.",
      priorite: "HAUTE",
      domaine: "Travaux",
      nombre: sansQuitusN1.length,
      actionSuggeree:
        "Vérifier la conformité réglementaire avant de poursuivre les travaux concernés.",
      details: sansQuitusN1.map((t) => `${t.reference} — ${t.bienNom}`),
    });
  }

  const retards = anomalies.retardsTravaux;
  if (retards.length > 0) {
    recos.push({
      id: "retards-travaux",
      titre: `${retards.length} ${plur(retards.length, "chantier")} en retard`,
      description:
        "La date de fin prévue est dépassée alors que les travaux ne sont ni terminés ni annulés.",
      priorite: "HAUTE",
      domaine: "Travaux",
      nombre: retards.length,
      actionSuggeree:
        "Planifier des contrôles terrain et réviser les délais des chantiers en retard.",
      details: retards.map(
        (t) => `${t.reference} — ${t.bienNom} — ${t.joursRetard} j de retard`
      ),
    });
  }

  const delais = alertes.delaisOccupation;
  if (delais.length > 0) {
    recos.push({
      id: "delais-occupation",
      titre: `${delais.length} ${plur(delais.length, "occupation")} à échéance proche ou dépassée`,
      description:
        "La date de sortie prévue arrive à échéance dans les 7 jours ou est déjà dépassée.",
      priorite: delais.some((d) => d.joursRestants < 0) ? "HAUTE" : "MOYENNE",
      domaine: "Occupation",
      nombre: delais.length,
      actionSuggeree:
        "Anticiper la libération du bien ou le renouvellement de l'occupation.",
      details: delais.map((d) =>
        d.joursRestants < 0
          ? `${d.bienNom} — ${d.occupant} — dépassé de ${Math.abs(d.joursRestants)} j`
          : `${d.bienNom} — ${d.occupant} — expire dans ${d.joursRestants} j`
      ),
    });
  }

  const multiples = anomalies.biensSurcharges;
  if (multiples.length > 0) {
    recos.push({
      id: "chantiers-multiples",
      titre: `${multiples.length} ${plur(multiples.length, "bien")} avec plusieurs chantiers actifs`,
      description:
        "Plusieurs chantiers actifs simultanément sur un même bien : risque d'incohérence ou de doublon.",
      priorite: "MOYENNE",
      domaine: "Travaux",
      nombre: multiples.length,
      actionSuggeree:
        "Vérifier la cohérence des chantiers actifs sur chacun de ces biens.",
      details: multiples.map((b) => `${b.bienNom} — ${b.nbChantiers} chantiers actifs`),
    });
  }

  const sansQuitus = alertes.biensSansQuitusRecent;
  if (sansQuitus.length > 0) {
    recos.push({
      id: "sans-quitus-annee",
      titre: `${sansQuitus.length} ${plur(sansQuitus.length, "bien")} sans quitus ${annee}`,
      description: `Aucun quitus n'est enregistré pour l'année ${annee} sur ces biens.`,
      priorite: "BASSE",
      domaine: "Recensement",
      nombre: sansQuitus.length,
      actionSuggeree:
        "Établir la liste des biens sans quitus et la répartir entre les agents.",
      details: sansQuitus.map((b) => b.nomDuBien),
    });
  }

  return recos.sort(
    (x, y) =>
      ORDRE_PRIORITE[x.priorite] - ORDRE_PRIORITE[y.priorite] ||
      y.nombre - x.nombre
  );
}

// ==========================================
// ALERTES ET SIGNAUX FAIBLES
// ==========================================

export function buildAlertes(a: Analyse): AlerteUI[] {
  const alertes: AlerteUI[] = [];
  const annee = new Date().getFullYear();

  a.alertes.delaisOccupation.forEach((d, i) => {
    const depasse = d.joursRestants < 0;
    alertes.push({
      id: `delai-${i}`,
      titre: `${depasse ? "Délai dépassé" : "Fin d'occupation proche"} · ${d.bienNom}`,
      description: d.message,
      niveau: depasse ? "critique" : "attention",
      icon: depasse ? "🚨" : "⏳",
    });
  });

  a.anomalies.biensSurcharges.forEach((b, i) => {
    alertes.push({
      id: `multi-${i}`,
      titre: `Chantiers multiples · ${b.bienNom}`,
      description: b.message,
      niveau: "attention",
      icon: "🏗️",
    });
  });

  const nbSansQuitus = a.alertes.biensSansQuitusRecent.length;
  if (nbSansQuitus > 0) {
    alertes.push({
      id: "quitus-annee",
      titre: `${nbSansQuitus} ${plur(nbSansQuitus, "bien")} sans quitus ${annee}`,
      description: "Compléter les quitus de l'année en cours.",
      niveau: "info",
      icon: "📋",
    });
  }

  const ordre = { critique: 0, attention: 1, info: 2 } as const;
  return alertes.sort((x, y) => ordre[x.niveau] - ordre[y.niveau]);
}

// ==========================================
// CHAT : réponses calculées sur les données réelles
// ==========================================

export const SCENARIOS = [
  "Que dois-je traiter en priorité ?",
  "Quels chantiers sont en retard ?",
  "Y a-t-il des occupations sans titre ?",
  "Quelles occupations se terminent bientôt ?",
];

export function suggestionsSuivantes(question: string, ctx: Contexte): string[] {
  const normaliser = (texte: string) =>
    texte
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const q = normaliser(question);
  const suggestions: string[] = [];
  const ajouter = (condition: boolean, texte: string) => {
    if (condition && !suggestions.includes(texte)) suggestions.push(texte);
  };
  const analyse = ctx.analyse;
  const indicateurs = ctx.indicateurs;

  ajouter(
    Boolean(analyse?.anomalies.retardsTravaux.length || indicateurs?.travauxEnRetard),
    "Quels chantiers sont en retard ?",
  );
  ajouter(
    Boolean(analyse?.anomalies.travauxSansQuitus.length || indicateurs?.travauxSansQuitus),
    "Quels travaux sont sans quitus N-1 ?",
  );
  ajouter(
    Boolean(analyse?.anomalies.occupantsSansTitre.length || indicateurs?.occupantsSansTitre),
    "Quelles occupations sont sans titre ?",
  );
  ajouter(
    Boolean(analyse?.alertes.delaisOccupation.length || indicateurs?.occupationsFin30j),
    "Quelles occupations arrivent bientôt à échéance ?",
  );
  ajouter(Boolean(analyse?.anomalies.doublonsAvantageLogement.length), "Quels doublons d’avantage logement faut-il régulariser ?");
  ajouter(Boolean(analyse?.anomalies.biensSurcharges.length), "Quels biens ont plusieurs chantiers actifs ?");

  const estTravaux = /travaux|chantier|retard/.test(q);
  const estOccupation = /occupation|occupant|liberation|liberer|echeance/.test(q);
  const estQuitus = /quitus|recensement/.test(q);
  const estBien = /bien|libre|occupe|patrimoine/.test(q);
  const ordreParSujet = estTravaux
    ? ["Quels chantiers sont en retard ?", "Quels travaux sont sans quitus N-1 ?", "Quels biens ont plusieurs chantiers actifs ?"]
    : estOccupation
      ? ["Quelles occupations sont sans titre ?", "Quelles occupations arrivent bientôt à échéance ?", "Quels doublons d’avantage logement faut-il régulariser ?"]
      : estQuitus
        ? ["Quels travaux sont sans quitus N-1 ?", "Quels chantiers sont en retard ?", "Quels biens ont plusieurs chantiers actifs ?"]
        : estBien
          ? ["Quels biens ont plusieurs chantiers actifs ?", "Quelles occupations sont sans titre ?", "Quels chantiers sont en retard ?"]
          : [
              "Quels chantiers sont en retard ?",
              "Quelles occupations sont sans titre ?",
              "Quels travaux sont sans quitus N-1 ?",
            ];

  const priorisees = [
    ...ordreParSujet.filter((s) => suggestions.includes(s)),
    ...suggestions.filter((s) => !ordreParSujet.includes(s)),
  ];

  if (indicateurs?.biens) {
    priorisees.push("Combien de biens sont libres et combien sont occupés ?");
  }

  const result = priorisees.slice(0, 3);
  return result.length > 0 ? result : SCENARIOS.slice(0, 3);
}

function liste(lignes: string[], max = 5): string {
  const vues = lignes.slice(0, max).map((l) => `• ${l}`);
  if (lignes.length > max) vues.push(`… et ${lignes.length - max} autre(s).`);
  return vues.join("\n");
}

function detailIndisponible(ctx: Contexte): string {
  const i = ctx.indicateurs;

  const base = ctx.analyseRestreinte
    ? "Le détail des anomalies est réservé au Chef SRB et à l'Administrateur."
    : "Le rapport détaillé n'a pas pu être chargé pour le moment.";

  if (!i) return base;

  return (
    `${base}\nIndicateurs disponibles :\n` +
    `• ${i.travauxEnRetard} chantier(s) en retard\n` +
    `• ${i.travauxSansQuitus} chantier(s) sans quitus N-1\n` +
    `• ${i.occupantsSansTitre} occupation(s) sans titre\n` +
    `• ${i.occupationsFin30j} fin(s) d'occupation sous 30 jours`
  );
}

function synthese(ctx: Contexte): string {
  const { analyse, indicateurs } = ctx;
  const lignes: string[] = [];

  if (indicateurs) lignes.push(`Niveau de risque : ${indicateurs.niveauRisque}.`);

  if (analyse) {
    lignes.push(`${analyse.resume.totalAlertes} alerte(s) active(s).`);
    lignes.push(...analyse.suggestions);
  } else {
    lignes.push(detailIndisponible(ctx));
  }

  return lignes.join("\n");
}

export function repondre(question: string, ctx: Contexte): string {
  if (!ctx.indicateurs && !ctx.analyse) {
    return "Je n'ai pas pu charger les données pour le moment. Réessayez dans un instant.";
  }

  const q = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const a = ctx.analyse;
  const has = (...mots: string[]) => mots.some((m) => q.includes(m));

  // Aide
  if (/^(bonjour|salut|hello|bonsoir|aide|help)\b/.test(q) || has("que peux", "tu peux")) {
    return (
      "Je réponds à partir des données actuelles : chantiers en retard, quitus, occupations sans titre, " +
      "fins d'occupation, doublons d'avantage logement, taux d'occupation. Posez votre question ou choisissez un scénario."
    );
  }

  // Doublons d'avantage logement
  if (has("doublon", "avantage", "unicite", "cumul")) {
    if (!a) return detailIndisponible(ctx);
    const d = a.anomalies.doublonsAvantageLogement;
    if (d.length === 0) return "Aucun doublon d'avantage logement détecté.";
    return (
      `${d.length} doublon(s) d'avantage logement (logement de fonction + bail actif) :\n` +
      liste(d.map((x) => `${x.occupant} — occupation ${x.occupationRef}, bail ${x.bailRef}`)) +
      "\nAction : régulariser chaque cumul (principe d'unicité)."
    );
  }

  // Quitus
  if (has("quitus")) {
    if (!a) return detailIndisponible(ctx);
    const n1 = a.anomalies.travauxSansQuitus;
    const annee = a.alertes.biensSansQuitusRecent.length;
    const parts: string[] = [];

    parts.push(
      n1.length === 0
        ? "Aucun chantier sans quitus N-1."
        : `${n1.length} chantier(s) sans quitus N-1 (Circulaire N°813) :\n` +
            liste(n1.map((t) => `${t.reference} — ${t.bienNom}`))
    );
    parts.push(`${annee} bien(s) sans quitus pour l'année en cours.`);

    return parts.join("\n");
  }

  // Travaux / chantiers / retards
  if (has("travaux", "chantier", "retard")) {
    if (!a) return detailIndisponible(ctx);
    const r = a.anomalies.retardsTravaux;
    const m = a.anomalies.biensSurcharges;
    const parts: string[] = [];

    parts.push(
      r.length === 0
        ? "Aucun chantier en retard."
        : `${r.length} chantier(s) en retard :\n` +
            liste(r.map((t) => `${t.reference} — ${t.bienNom} — ${t.joursRetard} j de retard`))
    );

    if (m.length > 0) {
      parts.push(
        `${m.length} bien(s) avec plusieurs chantiers actifs :\n` +
          liste(m.map((b) => `${b.bienNom} — ${b.nbChantiers} chantiers`))
      );
    }

    return parts.join("\n");
  }

  // Occupations sans titre / contentieux
  if (has("sans titre", "titre", "contentieux", "judiciaire")) {
    if (!a) return detailIndisponible(ctx);
    const s = a.anomalies.occupantsSansTitre;
    if (s.length === 0) return "Aucune occupation sans titre légal.";
    return (
      `${s.length} occupation(s) sans titre légal :\n` +
      liste(s.map((o) => `${o.bienNom} — ${o.occupant}`)) +
      "\nAction : initier la libération ou une procédure judiciaire."
    );
  }

  // Occupations / délais / libération
  if (has("occupation", "occupant", "delai", "expire", "libere", "liberation", "bientot", "fin")) {
    if (!a) return detailIndisponible(ctx);
    const d = a.alertes.delaisOccupation;
    const nbSansTitre = a.anomalies.occupantsSansTitre.length;

    const texte =
      d.length === 0
        ? "Aucune occupation n'arrive à échéance dans les 7 jours."
        : `${d.length} occupation(s) à échéance proche ou dépassée :\n` +
          liste(
            d.map((x) =>
              x.joursRestants < 0
                ? `${x.bienNom} — ${x.occupant} — dépassé de ${Math.abs(x.joursRestants)} j`
                : `${x.bienNom} — ${x.occupant} — expire dans ${x.joursRestants} j`
            )
          );

    return nbSansTitre > 0
      ? `${texte}\nPar ailleurs, ${nbSansTitre} occupation(s) sont sans titre légal.`
      : texte;
  }

  // Biens / taux d'occupation
  if (has("bien", "libre", "occupe", "taux", "combien", "patrimoine")) {
    const b = ctx.indicateurs?.biens;
    if (!b) return "Les indicateurs sur les biens ne sont pas disponibles pour le moment.";
    const taux = b.total > 0 ? Math.round((b.occupes / b.total) * 100) : 0;
    return (
      `${b.total} bien(s) au total : ${b.occupes} occupé(s) (${taux} %), ${b.libres} libre(s).`
    );
  }

  // Synthèse / priorités
  return synthese(ctx);
}