/**
 * TEMPLATE OFFICIEL DU QUITUS DE RECENSEMENT
 * Format : A4 Portrait
 * Norme visuelle : document officiel République de Madagascar (Haute Matsiatra)
 * Champs non renseignés = laissés vides
 */

export interface QuitusTemplateData {
  numeroQuitus: string;
  annee: number;

  ministere?: string;
  secretariatGeneral?: string;
  directionGenerale?: string;
  direction?: string;
  service?: string;
  region?: string;
  ville?: string;

  // Personne qui dépose
  nomResponsable: string;
  fonctionResponsable?: string;
  nomService: string;

  // Identification des biens (peut contenir plusieurs bureaux)
  designationBureau: string;          // texte libre, peut contenir plusieurs lignes
  nomPropriete: string;
  titreFoncier: string;
  superficie: string;
  adresseBien: string;

  observations?: string;

  dateEmission: Date | string;

  nomSignataire?: string;
  fonctionSignataire?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Retourne la valeur ou une chaîne vide (jamais "Non renseigné") */
function valeur(value?: string | null): string {
  const v = value?.trim();
  return v ? escapeHtml(v) : "";
}

function formatDateFr(date: Date | string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return escapeHtml(String(date));

  const mois = [
    "JAN", "FEV", "MAR", "AVR", "MAI", "JUN",
    "JUL", "AOU", "SEP", "OCT", "NOV", "DEC",
  ];
  const jour = String(d.getDate()).padStart(2, "0");
  const moisAbbr = mois[d.getMonth()];
  const annee = d.getFullYear();
  return `${jour} ${moisAbbr} ${annee}`;
}

export function generateQuitusTemplate(data: QuitusTemplateData): string {
  const numero = escapeHtml(data.numeroQuitus);
  const annee = escapeHtml(data.annee);

  // En-tête administratif (valeurs par défaut = norme Haute Matsiatra)
  const ministere = valeur(data.ministere) || "MINISTERE DE L’ECONOMIE ET DES FINANCES";
  const secretariat = valeur(data.secretariatGeneral) || "SECRETARIAT GENERAL";
  const directionGenerale =
    valeur(data.directionGenerale) || "DIRECTION GENERALE DU BUDGET<br/>ET DES FINANCES";
  const direction = valeur(data.direction) || "DIRECTION DU BUDGET";
  const service = valeur(data.service) || "SERVICE REGIONAL DU BUDGET";
  const region = valeur(data.region) || "HAUTE MATSIATRA";
  const ville = valeur(data.ville) || "FIANARANTSOA";

  const dateEmission = formatDateFr(data.dateEmission);

  // Construction du paragraphe d’identification (style image officielle)
  const bureauxHtml = data.designationBureau
    ? data.designationBureau
        .split(/\n|;/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `- ${escapeHtml(l)}${l.endsWith(";") ? "" : " ;"}`)
        .join("<br/>")
    : "";

  const proprieteParts: string[] = [];
  if (data.nomPropriete?.trim()) {
    proprieteParts.push(`bâtis sur la propriété dite « ${valeur(data.nomPropriete)} »`);
  }
  if (data.titreFoncier?.trim()) {
    proprieteParts.push(`suivant titre foncier N° ${valeur(data.titreFoncier)}`);
  }
  if (data.superficie?.trim()) {
    proprieteParts.push(`d’une superficie ${valeur(data.superficie)}`);
  }
  if (data.adresseBien?.trim()) {
    proprieteParts.push(`sis à ${valeur(data.adresseBien)}`);
  }

  const lignePropriete =
    proprieteParts.length > 0 ? proprieteParts.join(", ") + "." : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Quitus ${numero}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 18mm 15mm 18mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }

    .document {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      position: relative;
    }

    /* ── En-tête République ── */
    .republique-block {
      text-align: center;
      margin-bottom: 8px;
    }
    .republique {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .devise {
      font-size: 9pt;
      font-style: italic;
      margin-top: 1px;
    }

    /* ── Bloc administration (gauche + centre) ── */
    .admin-block {
      text-align: center;
      text-transform: uppercase;
      font-size: 11pt;
      line-height: 1.3;
      margin: 12px 0 6px;
    }
    .admin-block p { margin: 0; }
    .admin-block .ministere { font-weight: bold; }
    .admin-block .service   { font-weight: bold; }

    .sep {
      border: none;
      border-top: 1px solid #222;
      margin: 10px auto 18px;
      width: 100%;
    }

    /* ── Titre QUITUS ── */
    .titre {
      text-align: center;
      margin: 22px 0 8px;
    }
    .titre h1 {
      font-size: 26pt;
      font-weight: bold;
      letter-spacing: 2px;
      margin: 0;
    }
    .reference {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 4px;
    }

    .sous-titre {
      text-align: center;
      font-size: 12pt;
      margin: 14px auto 20px;
      max-width: 150mm;
      font-style: italic;
    }

    /* ── Corps ── */
    .corps {
      text-align: justify;
      font-size: 12pt;
      line-height: 1.5;
    }
    .corps p {
      margin-bottom: 14px;
      text-indent: 28px;
    }
    .corps .no-indent {
      text-indent: 0;
    }
    .identification {
      margin: 12px 0 16px 28px;
      text-indent: 0;
    }
    .identification .ligne {
      margin-bottom: 4px;
    }

    /* ── Signature ── */
    .signature {
      margin-top: 36px;
      text-align: right;
      page-break-inside: avoid;
    }
    .lieu-date {
      margin-bottom: 28px;
    }
    .fonction {
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 50px;
      font-size: 11pt;
    }
    .nom-signataire {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .reserve {
      font-size: 9pt;
      font-style: italic;
      color: #444;
    }

    /* ── Aperçu écran ── */
    @media screen {
      body {
        background: #e8e8e8;
        padding: 24px 0;
      }
      .document {
        background: #fff;
        padding: 14mm 18mm;
        min-height: 297mm;
        box-shadow: 0 4px 24px rgba(0,0,0,0.15);
      }
      .preview-bar {
        position: sticky;
        top: 0;
        z-index: 100;
        background: #1e3a5f;
        color: #fff;
        padding: 12px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      .preview-bar button {
        background: #fff;
        color: #1e3a5f;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        margin-left: 8px;
      }
      .preview-bar button.secondary {
        background: transparent;
        color: #fff;
        border: 1px solid #fff;
      }
    }

    @media print {
      body { background: #fff; padding: 0; }
      .document { box-shadow: none; padding: 0; }
      .preview-bar { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- Barre d’aperçu (visible uniquement à l’écran) -->
  <div class="preview-bar">
    <span>Aperçu du quitus officiel — vérifiez avant d’imprimer / enregistrer en PDF</span>
    <div>
      <button onclick="window.print()">🖨 Imprimer / Enregistrer en PDF</button>
      <button class="secondary" onclick="window.close()">Fermer</button>
    </div>
  </div>

  <main class="document">

    <!-- EN-TÊTE RÉPUBLIQUE -->
    <div class="republique-block">
      <div class="republique">REPOBLIKAN’I MADAGASIKARA</div>
      <div class="devise">Fitiavana – Tanindrazana – Fandrosoana</div>
    </div>

    <div class="admin-block">
      <p class="ministere">${ministere}</p>
      <p>${secretariat}</p>
      <p>${directionGenerale}</p>
      <p>${direction}</p>
      <p class="service">${service}</p>
      <p>${region}</p>
      <p>${ville}</p>
    </div>

    <hr class="sep" />

    <!-- TITRE -->
    <div class="titre">
      <h1>QUITUS</h1>
      <div class="reference">
        n° ${numero}/${annee}-MEF/SG/DGBF/DB/SRB/HM.
      </div>
    </div>

    <div class="sous-titre">
      Attestant la réception de dossier de recensement des logements et<br/>
      Bâtiments administratifs.
    </div>

    <!-- CORPS -->
    <section class="corps">
      <p>
        Le Chef du Service Régional du Budget de la ${region || "Haute Matsiatra"}
        atteste que ${valeur(data.nomResponsable)}${
          data.fonctionResponsable?.trim()
            ? `, ${valeur(data.fonctionResponsable)}`
            : ""
        }${
          data.nomService?.trim()
            ? ` de ${valeur(data.nomService)}`
            : ""
        } a déposé le dossier de recensement des bâtiments administratifs
        relevant de son domaine :
      </p>

      <div class="identification">
        ${bureauxHtml ? `<div class="ligne">${bureauxHtml}</div>` : ""}
        ${
          lignePropriete
            ? `<div class="ligne" style="margin-top:6px;">${lignePropriete}</div>`
            : ""
        }
      </div>

      <p class="no-indent">
        Les bureaux nécessitant l’entretien se figurent dans le dossier de recensement
        ci-dessus.
      </p>
    </section>

    <!-- SIGNATURE -->
    <section class="signature">
      <p class="lieu-date">
        ${ville || "Fianarantsoa"}, le ${dateEmission}
      </p>

      <p class="fonction">
        ${valeur(data.fonctionSignataire) || "LE CHEF DU SERVICE RÉGIONAL DU BUDGET"}
      </p>

      ${
        data.nomSignataire?.trim()
          ? `<p class="nom-signataire">${valeur(data.nomSignataire)}</p>`
          : ""
      }

      <p class="reserve">(Signature et cachet de l’autorité compétente)</p>
    </section>

  </main>

</body>
</html>`;
}