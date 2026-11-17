export function getAvenantTemplate(data: {
  numeroAvenant: string;
  numeroBail: string;
  dateAvenant: string | Date;
  typeAvenant: string;
  description?: string;

  // Infos du bail
  bien: {
    numeroBien: string;
    nomDuBien: string;
    adresse: string;
    localite?: string;
  };
  locataire: {
    nom: string;
    prenom: string;
    matricule: string;
    cin?: string;
    ministere?: string;
    fonction?: string;
  };

  // Modifications
  ancienMontant?: number;
  nouveauMontant?: number;
  ancienneDateFin?: string | Date;
  nouvelleDateFin?: string | Date;

  lieuSignature?: string;
}) {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatMontant = (montant?: number) => {
    if (!montant) return '—';
    return `${montant.toLocaleString('fr-FR')} Ariary`;
  };

  return {
    pageSize: 'A4',
    pageMargins: [50, 40, 50, 40],
    content: [
      // ========== EN-TÊTE ==========
      {
        text: 'REPOBLIKAN’I MADAGASIKARA',
        alignment: 'center',
        fontSize: 11,
        bold: true,
      },
      {
        text: 'Fitiavana – Tanindrazana – Fandrosoana',
        alignment: 'center',
        fontSize: 9,
        italics: true,
        margin: [0, 2, 0, 8],
      },
      {
        text: 'MINISTÈRE DE L’ÉCONOMIE ET DES FINANCES',
        alignment: 'center',
        fontSize: 10,
        bold: true,
      },
      {
        text: 'SERVICE RÉGIONAL DU BUDGET – HAUTE MATSIATRA',
        alignment: 'center',
        fontSize: 10,
        bold: true,
        margin: [0, 0, 0, 15],
      },

      // ========== TITRE ==========
      {
        text: `AVENANT N° ${data.numeroAvenant}`,
        alignment: 'center',
        fontSize: 14,
        bold: true,
        margin: [0, 5, 0, 3],
      },
      {
        text: `DU CONTRAT DE BAIL À LOYER N° ${data.numeroBail}`,
        alignment: 'center',
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 15],
      },

      // ========== PARTIES ==========
      {
        text: 'Entre les soussignés :',
        bold: true,
        fontSize: 10,
        margin: [0, 0, 0, 6],
      },
      {
        text: [
          { text: 'D’une part,\n', bold: true },
          'L’État Malagasy, représenté par le Chef de Service Régional du Budget de la Haute Matsiatra, ci-après dénommé « le Bailleur ».\n\n',
          { text: 'Et d’autre part,\n', bold: true },
          `Monsieur/Madame ${data.locataire.prenom} ${data.locataire.nom}, Matricule ${data.locataire.matricule}`,
          data.locataire.fonction ? `, ${data.locataire.fonction}` : '',
          data.locataire.ministere ? ` au ${data.locataire.ministere}` : '',
          ', ci-après dénommé « le Preneur ».',
        ],
        fontSize: 10,
        alignment: 'justify',
        margin: [0, 0, 0, 12],
      },

      {
        text: 'IL A ÉTÉ ARRÊTÉ ET CONVENU CE QUI SUIT :',
        bold: true,
        alignment: 'center',
        fontSize: 11,
        margin: [0, 5, 0, 12],
      },

      // ========== ARTICLES ==========
      {
        text: 'Article 1 – Objet de l’avenant',
        bold: true,
        fontSize: 11,
        margin: [0, 5, 0, 4],
      },
      {
        text: data.description
          ? data.description
          : `Le présent avenant a pour objet de modifier les conditions du contrat de bail n° ${data.numeroBail} portant sur le bien situé à ${data.bien.adresse}${data.bien.localite ? `, ${data.bien.localite}` : ''}.`,
        fontSize: 10,
        alignment: 'justify',
        margin: [0, 0, 0, 10],
      },

      {
        text: 'Article 2 – Modifications apportées',
        bold: true,
        fontSize: 11,
        margin: [0, 5, 0, 4],
      },
      {
        ul: [
          data.nouveauMontant
            ? `Loyer : l’ancien montant de ${formatMontant(data.ancienMontant)} est modifié et fixé désormais à ${formatMontant(data.nouveauMontant)}.`
            : null,
          data.nouvelleDateFin
            ? `Durée : la date de fin du bail est prolongée / modifiée au ${formatDate(data.nouvelleDateFin)} (ancienne date : ${data.ancienneDateFin ? formatDate(data.ancienneDateFin) : '—'}).`
            : null,
          `Type d’avenant : ${data.typeAvenant.replace(/_/g, ' ')}.`,
        ].filter(Boolean),
        fontSize: 10,
        margin: [0, 0, 0, 10],
      },

      {
        text: 'Article 3 – Maintien des autres clauses',
        bold: true,
        fontSize: 11,
        margin: [0, 5, 0, 4],
      },
      {
        text: 'Toutes les autres clauses et conditions du contrat de bail initial non modifiées par le présent avenant restent inchangées et continuent de produire leurs effets.',
        fontSize: 10,
        alignment: 'justify',
        margin: [0, 0, 0, 15],
      },

      {
        text: 'Article 4 – Entrée en vigueur',
        bold: true,
        fontSize: 11,
        margin: [0, 5, 0, 4],
      },
      {
        text: `Le présent avenant prend effet à compter de sa date de signature.`,
        fontSize: 10,
        alignment: 'justify',
        margin: [0, 0, 0, 25],
      },

      // ========== SIGNATURES ==========
      {
        text: `Fait à ${data.lieuSignature || 'Fianarantsoa'}, le ${formatDate(data.dateAvenant)}`,
        alignment: 'right',
        fontSize: 10,
        margin: [0, 10, 0, 30],
      },

      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Le Preneur', bold: true, alignment: 'center' },
              { text: '(Lu et approuvé)', fontSize: 9, alignment: 'center', margin: [0, 3, 0, 45] },
              { text: '________________________', alignment: 'center' },
              {
                text: `${data.locataire.prenom} ${data.locataire.nom}`,
                alignment: 'center',
                fontSize: 9,
                margin: [0, 5, 0, 0],
              },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Le Bailleur', bold: true, alignment: 'center' },
              {
                text: 'Le Chef de Service Régional\ndu Budget – Haute Matsiatra',
                fontSize: 9,
                alignment: 'center',
                margin: [0, 3, 0, 45],
              },
              { text: '________________________', alignment: 'center' },
            ],
          },
        ],
      },
    ],
    defaultStyle: {
      fontSize: 10,
    },
  };
}