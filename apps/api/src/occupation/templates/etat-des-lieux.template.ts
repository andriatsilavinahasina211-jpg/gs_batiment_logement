export function getEtatDesLieuxTemplate(formulaire: {
  descriptionBien?: string;
  lieu?: string;
  date?: Date | string;
  signataireBailleur?: string;
  signataireAdministration?: string;
  observationsGenerales?: string;
  pieces: Array<{
    designation: string;
    etat: number | string;
    caracteristiques: string[] | string;
  }>;
}) {
  // ── Formatage de la date : "04 JAN 2023" ou "08 SEPT 2026"
  const dateObj = formulaire.date ? new Date(formulaire.date) : new Date();
  const formattedDate = dateObj
    .toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase()
    .replace('.', '');

  const lieu = formulaire.lieu || 'Fianarantsoa';
  const lieuEtDate = `${lieu}, le ${formattedDate}`;

  // ── Formatage des lignes du tableau
  const rows = formulaire.pieces.map((piece) => {
    let detailsText = '';
    if (Array.isArray(piece.caracteristiques)) {
      detailsText = piece.caracteristiques
        .map((item) => {
          const trimmed = item.trim();
          return trimmed.startsWith('-') ? trimmed : `-${trimmed}`;
        })
        .join('\n');
    } else if (typeof piece.caracteristiques === 'string') {
      detailsText = piece.caracteristiques
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return '';
          return trimmed.startsWith('-') ? trimmed : `-${trimmed}`;
        })
        .filter(Boolean)
        .join('\n');
    }

    return [
      {
        text: piece.designation,
        alignment: 'center',
        fontSize: 9.5,
      },
      {
        text: String(piece.etat),
        alignment: 'center',
        fontSize: 9.5,
      },
      {
        text: detailsText,
        fontSize: 9,
        lineHeight: 1.15,
      },
    ];
  });

  return {
    pageSize: 'A4',
    // Marges précises et aérées conformes à la page administrative
    pageMargins: [40, 35, 40, 35],

    content: [
      // ── Titre centré NON SOULIGNÉ (exactement comme dans l'image originale)
      {
        text: 'ETAT DES LIEUX',
        fontSize: 12,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 14],
      },

      // ── Description du bien justifiée (paragraphe d'introduction)
      {
        text:
          formulaire.descriptionBien ||
          'Description du bien non renseignée.',
        fontSize: 9.5,
        alignment: 'justify',
        lineHeight: 1.25,
        margin: [0, 0, 0, 12],
      },

      // ── Tableau principal avec colonnes exactes et bordures fines
      {
        table: {
          headerRows: 1,
          widths: [135, 38, '*'],
          body: [
            // ── En-tête du tableau
            [
              {
                text: 'DESIGNATIONS',
                bold: true,
                fontSize: 9,
                alignment: 'center',
              },
              {
                text: 'ETAT',
                bold: true,
                fontSize: 9,
                alignment: 'center',
              },
              {
                text: 'CARACTERISTIQUES SPECIFIQUES',
                bold: true,
                fontSize: 9,
                alignment: 'center',
              },
            ],
            // ── Lignes dynamiques des pièces
            ...rows,
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
        margin: [0, 0, 0, 14],
      },

      // ── Légende ANB à gauche + Date à droite (sur la même ligne)
      {
        margin: [0, 0, 0, 24],
        columns: [
          {
            width: '*',
            stack: [
              { text: 'ANB : 1= Bon', fontSize: 9, bold: true },
              { text: '         2=Moyen', fontSize: 9, margin: [0, 1, 0, 0] },
              { text: '         3=Nécessite un entretien', fontSize: 9, margin: [0, 1, 0, 0] },
            ],
          },
          {
            width: 'auto',
            text: lieuEtDate,
            fontSize: 9.5,
            alignment: 'right',
          },
        ],
      },

      // ── Observations éventuelles (placées AVANT les signatures si présentes)
      ...(formulaire.observationsGenerales?.trim()
        ? [
            {
              text: `Observations : ${formulaire.observationsGenerales.trim()}`,
              fontSize: 9,
              italics: true,
              margin: [0, 0, 0, 20],
            },
          ]
        : []),

      // ── Bloc des signatures (exactement comme dans l'image page 2)
      {
        columns: [
          // ── Colonne de Gauche : Le Bailleur & L'Administration avec grand espace de signature
          {
            width: '48%',
            stack: [
              {
                text: 'Le Bailleur',
                fontSize: 10,
                bold: true,
                margin: [0, 0, 0, 0],
              },
              // Grand espace pour signature manuscrite
              {
                text: formulaire.signataireBailleur
                  ? `\n\n\n\n${formulaire.signataireBailleur}`
                  : '\n\n\n\n\n',
                fontSize: 9.5,
                margin: [0, 0, 0, 20],
              },
              {
                text: "L'Administration",
                fontSize: 10,
                bold: true,
                margin: [0, 0, 0, 0],
              },
              // Espace pour signature / tampon
              {
                text: formulaire.signataireAdministration
                  ? `\n\n\n\n${formulaire.signataireAdministration}`
                  : '\n\n\n\n\n',
                fontSize: 9.5,
              },
            ],
          },

          // ── Espace central
          { width: '4%', text: '' },

          // ── Colonne de Droite : Visas administratifs
          {
            width: '48%',
            stack: [
              {
                text: 'Vu : Le Chef de Bureau des Logements\net Bâtiments Administratifs',
                fontSize: 9.5,
                bold: true,
                alignment: 'center',
                lineHeight: 1.2,
                margin: [0, 0, 0, 0],
              },
              // Espace pour tampon rond et signature
              {
                text: '\n\n\n\n\n',
                fontSize: 9.5,
                margin: [0, 0, 0, 20],
              },
              {
                text: "Le Chef de Division du Patrimoine de l'Etat",
                fontSize: 9.5,
                bold: true,
                alignment: 'center',
                lineHeight: 1.2,
              },
              // Espace pour tampon rond et signature
              {
                text: '\n\n\n\n\n',
                fontSize: 9.5,
              },
            ],
          },
        ],
      },
    ],

    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
    },
  };
}