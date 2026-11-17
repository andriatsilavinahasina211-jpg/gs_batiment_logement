export function getContratBailTemplate(data: {
  numeroBail: string;
  dateDebut: string | Date;
  dateFin: string | Date;
  montantLoyer?: number;
  bien: {
    numeroBien: string;
    nomDuBien: string;
    adresse: string;
    localite?: string;
    typeBien: string;
  };
  locataire: {
    nom: string;
    prenom: string;
    matricule: string;
    cin?: string;
    telephone?: string;
    ministere?: string;
    fonction?: string;
  };
  lieuSignature?: string;
  dateSignature?: string | Date;
}) {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const montantEnLettres = data.montantLoyer
    ? `${data.montantLoyer.toLocaleString('fr-FR')} Ariary`
    : 'À définir';

  return {
    pageSize: 'A4',
    pageMargins: [50, 50, 50, 50],
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
        margin: [0, 2, 0, 10],
      },
      {
        text: 'MINISTÈRE DE L’ÉCONOMIE ET DES FINANCES',
        alignment: 'center',
        fontSize: 10,
        bold: true,
      },
      {
        text: 'DIRECTION GÉNÉRALE DU BUDGET',
        alignment: 'center',
        fontSize: 10,
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
        text: 'CONTRAT DE BAIL',
        alignment: 'center',
        fontSize: 16,
        bold: true,
        decoration: 'underline',
        margin: [0, 10, 0, 5],
      },
      {
        text: `N° ${data.numeroBail}`,
        alignment: 'center',
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 20],
      },

      // ========== PARTIES ==========
      {
        text: 'ENTRE LES SOUSSIGNÉS :',
        bold: true,
        fontSize: 11,
        margin: [0, 0, 0, 8],
      },
      {
        text: [
          { text: 'D’une part,\n', bold: true },
          'L’État Malagasy, représenté par le Chef de Service Régional du Budget de la Haute Matsiatra, agissant au nom et pour le compte de l’Administration, ci-après dénommé « le Bailleur ».\n\n',
          { text: 'Et d’autre part,\n', bold: true },
          `Monsieur/Madame ${data.locataire.prenom} ${data.locataire.nom}, Matricule ${data.locataire.matricule}`,
          data.locataire.cin ? `, CIN n° ${data.locataire.cin}` : '',
          data.locataire.fonction ? `, ${data.locataire.fonction}` : '',
          data.locataire.ministere ? ` au ${data.locataire.ministere}` : '',
          ', ci-après dénommé « le Preneur » ou « le Locataire ».',
        ],
        fontSize: 10,
        alignment: 'justify',
        margin: [0, 0, 0, 15],
      },

      // ========== OBJET ==========
      {
        text: 'IL A ÉTÉ CONVENU CE QUI SUIT :',
        bold: true,
        fontSize: 11,
        margin: [0, 0, 0, 10],
      },

      {
        text: 'Article 1 – Objet du contrat',
        bold: true,
        fontSize: 11,
        margin: [0, 5, 0, 4],
      },
      {
        text: `Le Bailleur donne à bail au Preneur le bien immobilier suivant :\n\n• Numéro du bien : ${data.bien.numeroBien}\n• Désignation : ${data.bien.nomDuBien}\n• Type : ${data.bien.typeBien}\n• Adresse : ${data.bien.adresse}${data.bien.localite ? `, ${data.bien.localite}` : ''}`,
        fontSize: 10,
        alignment: 'justify',
        margin: [0, 0, 0, 10],
      },

      {
        text: 'Article 2 – Durée',
        bold: true,
        fontSize: 11,
        margin: [0, 5, 0, 4],
      },
      {
        text: `Le présent bail est consenti pour une durée déterminée allant du ${formatDate(data.dateDebut)} au ${formatDate(data.dateFin)}.`,
        fontSize: 10,
        alignment: 'justify',
        margin: [0, 0, 0, 10],
      },

      {
        text: 'Article 3 – Loyer',
        bold: true,
        fontSize: 11,
        margin: [0, 5, 0, 4],
      },
      {
        text: `Le loyer mensuel est fixé à la somme de ${montantEnLettres}.\nLe paiement s’effectue selon les modalités fixées par l’Administration.`,
        fontSize: 10,
        alignment: 'justify',
        margin: [0, 0, 0, 10],
      },

      {
        text: 'Article 4 – Obligations du Preneur',
        bold: true,
        fontSize: 11,
        margin: [0, 5, 0, 4],
      },
      {
        ul: [
          'Occuper personnellement les lieux et les maintenir en bon état d’entretien.',
          'Ne pas sous-louer ni céder le bail sans autorisation écrite préalable du Bailleur.',
          'Respecter la destination des lieux.',
          'Signaler immédiatement tout dommage ou désordre.',
          'Restituer les lieux en bon état à la fin du bail.',
        ],
        fontSize: 10,
        margin: [0, 0, 0, 10],
      },

      {
        text: 'Article 5 – Clauses interdites',
        bold: true,
        fontSize: 11,
        margin: [0, 5, 0, 4],
      },
      {
        text: 'Le présent contrat ne comporte aucune clause de caution, de dépôt de garantie, de tacite reconduction ou d’indexation automatique, conformément à la réglementation en vigueur.',
        fontSize: 10,
        alignment: 'justify',
        margin: [0, 0, 0, 10],
      },

      {
        text: 'Article 6 – Résiliation',
        bold: true,
        fontSize: 11,
        margin: [0, 5, 0, 4],
      },
      {
        text: 'Le bail peut être résilié de plein droit en cas de manquement grave du Preneur à ses obligations, après mise en demeure restée sans effet.',
        fontSize: 10,
        alignment: 'justify',
        margin: [0, 0, 0, 20],
      },

      // ========== SIGNATURES ==========
      {
        text: `Fait à ${data.lieuSignature || 'Fianarantsoa'}, le ${formatDate(data.dateSignature || new Date())}`,
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
              { text: '(Lu et approuvé)', fontSize: 9, alignment: 'center', margin: [0, 3, 0, 40] },
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
                margin: [0, 3, 0, 40],
              },
              { text: '________________________', alignment: 'center' },
            ],
          },
        ],
      },
    ],
    styles: {
      header: {
        fontSize: 14,
        bold: true,
      },
    },
    defaultStyle: {
      fontSize: 10,
    },
  };
}