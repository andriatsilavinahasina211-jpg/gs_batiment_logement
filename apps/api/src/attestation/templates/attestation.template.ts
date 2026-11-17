import * as fs from 'fs';
import * as path from 'path';

export type AttestationPdfData = {
  reference: string;
  typeAttestation: 'NON_LOGEMENT' | 'NON_OCCUPATION';
  dateGeneration: string | Date;
  demandeur: {
    nom: string;
    prenom: string;
    matricule: string;
    cin?: string;
    ministere?: string;
    fonction?: string;
  };
  lieu?: string;
  civilite?: string;
  decretNumero?: string;
  decretDate?: string | Date;
  datePriseService?: string | Date;
  numeroOrdre?: string;
};

// Cache du logo MEF en Base64
let cachedMefLogoBase64: string | null = null;
function getMefLogoBase64(): string | null {
  if (cachedMefLogoBase64) return cachedMefLogoBase64;
  const possiblePaths = [
    path.resolve(__dirname, '../../assets/logo_mef.png'),
    path.resolve(__dirname, '../../../../web/public/logo_mef.png'),
    path.resolve(process.cwd(), 'src/assets/logo_mef.png'),
    path.resolve(process.cwd(), '../web/public/logo_mef.png'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const buf = fs.readFileSync(p);
        cachedMefLogoBase64 = `data:image/png;base64,${buf.toString('base64')}`;
        return cachedMefLogoBase64;
      } catch {
        // ignore
      }
    }
  }
  return null;
}

export function getAttestationTemplate(data: AttestationPdfData) {
  const formatDate = (d?: string | Date) => {
    if (!d) return '';
    try {
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return String(d);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const months = [
        'Janvier',
        'Février',
        'Mars',
        'Avril',
        'Mai',
        'Juin',
        'Juillet',
        'Août',
        'Septembre',
        'Octobre',
        'Novembre',
        'Décembre',
      ];
      return `${day} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    } catch {
      return String(d);
    }
  };

  const annee = data.dateGeneration
    ? new Date(data.dateGeneration).getFullYear()
    : new Date().getFullYear();

  const isNonLogement = data.typeAttestation === 'NON_LOGEMENT';
  const titre = isNonLogement
    ? "ATTESTATION DE NON LOGEMENT D'UN LOGEMENT ADMINISTRATIF"
    : "ATTESTATION DE NON OCCUPATION D'UN LOGEMENT ADMINISTRATIF";

  const mefLogo = getMefLogoBase64();

  // Extraction et mise en forme des informations
  const civilite = data.civilite || 'Monsieur';
  const nomComplet = `${data.demandeur.nom.toUpperCase()} ${data.demandeur.prenom || ''}`.trim();
  const im = data.demandeur.matricule ? data.demandeur.matricule : '........';
  const fonction = data.demandeur.fonction ? data.demandeur.fonction.trim() : '';
  const ministere = data.demandeur.ministere ? data.demandeur.ministere.trim() : '';

  // Mention du décret de nomination si disponible
  let mentionDecret = '';
  if (data.decretNumero && data.decretDate) {
    mentionDecret = ` suivant le décret n° ${data.decretNumero} du ${formatDate(data.decretDate)}`;
  } else if (data.decretNumero) {
    mentionDecret = ` suivant le décret n° ${data.decretNumero}`;
  }

  // Date de prise de service
  const datePriseServiceFmt = data.datePriseService
    ? formatDate(data.datePriseService)
    : formatDate(data.dateGeneration);

  // Numéro d'ordre officiel (ex: 404, ou vide pour complétion manuscrite)
  const numOrdreText = data.numeroOrdre ? ` ${data.numeroOrdre} ` : '          ';

  return {
    pageSize: 'A4' as const,
    pageMargins: [50, 40, 50, 45] as [number, number, number, number],
    content: [
      // 1. Haut de page : République de Madagascar
      {
        text: "REPOBLIKAN'I MADAGASIKARA",
        alignment: 'center',
        bold: true,
        fontSize: 10,
        characterSpacing: 0.5,
      },
      {
        text: 'Fitiavana – Tanindrazana – Fandrosoana',
        alignment: 'center',
        italics: true,
        fontSize: 8.5,
        margin: [0, 2, 0, 8],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 495,
            y2: 0,
            lineWidth: 0.75,
            lineColor: '#222222',
          },
        ],
        margin: [0, 0, 0, 14],
      },

      // 2. Bloc En-tête gauche Ministère & Services
      ...(mefLogo
        ? [
            {
              image: mefLogo,
              width: 50,
              margin: [0, 0, 0, 6],
            },
          ]
        : []),
      {
        text: "MINISTERE DE L'ECONOMIE ET DES FINANCES",
        bold: true,
        fontSize: 8.5,
        lineHeight: 1.15,
      },
      {
        text: 'SECRETARIAT GENERAL',
        bold: true,
        fontSize: 8.5,
        lineHeight: 1.15,
      },
      {
        text: 'DIRECTION GENERALE DU BUDGET',
        fontSize: 8.5,
        lineHeight: 1.15,
      },
      {
        text: 'ET DES FINANCES',
        fontSize: 8.5,
        lineHeight: 1.15,
      },
      {
        text: 'DIRECTION DU BUDGET',
        fontSize: 8.5,
        lineHeight: 1.15,
      },
      {
        text: 'SERVICE REGIONAL DU BUDGET',
        bold: true,
        fontSize: 8.5,
        lineHeight: 1.15,
      },
      {
        text: 'HAUTE MATSIATRA',
        bold: true,
        fontSize: 8.5,
        lineHeight: 1.15,
      },
      {
        text: '........................................................',
        fontSize: 7.5,
        margin: [0, 3, 0, 10],
      },

      // 3. Référence officielle N°
      {
        text: [
          { text: 'N°', bold: true },
          { text: numOrdreText },
          { text: `/${annee}/MEF/SG/DGBF/DB/SRB/HM-F`, bold: false },
        ],
        fontSize: 9,
        margin: [0, 0, 0, 32],
      },

      // 4. Titre central
      {
        text: titre,
        alignment: 'center',
        bold: true,
        fontSize: 12.5,
        decoration: 'underline',
        margin: [0, 5, 0, 35],
      },

      // 5. Corps de l'attestation - Paragraphe 1
      {
        text: [
          {
            text: '       Je soussigné, Chef du Service Régional du Budget de la Haute Matsiatra Fianarantsoa, atteste par la présente que ',
          },
          {
            text: `${civilite} ${nomComplet}`,
            bold: true,
          },
          {
            text: `, IM : ${im}`,
          },
          fonction ? { text: `, ${fonction}` } : '',
          ministere ? { text: ` du ${ministere}` } : '',
          mentionDecret ? { text: mentionDecret } : '',
          {
            text: `, n'est pas logé par l'Administration depuis le ${datePriseServiceFmt} , date de sa prise de service, jusqu'à ce jour.`,
          },
        ],
        fontSize: 11,
        lineHeight: 1.45,
        alignment: 'justify',
        margin: [0, 0, 0, 24],
      },

      // 6. Paragraphe 2 : En foi de quoi...
      {
        text: '       En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.',
        fontSize: 11,
        lineHeight: 1.45,
        alignment: 'justify',
        margin: [0, 0, 0, 45],
      },

      // 7. Lieu et Date
      {
        text: `Fianarantsoa, le ${formatDate(data.dateGeneration)}`,
        alignment: 'right',
        fontSize: 11,
        margin: [0, 0, 30, 40],
      },

      // 8. Espace signature et cachet officiel
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            alignment: 'center',
            stack: [
              {
                text: 'Le Chef du Service Régional du Budget',
                bold: true,
                fontSize: 10,
              },
              {
                text: 'Haute Matsiatra',
                bold: true,
                fontSize: 10,
              },
            ],
            margin: [0, 0, 20, 0],
          },
        ],
      },
    ],
    defaultStyle: {
      fontSize: 10,
    },
  };
}