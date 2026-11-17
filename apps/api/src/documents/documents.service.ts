import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

// pdfmake setup
const pdfMakePrinter = require('pdfmake');
const fontDescriptors = {
  Roboto: {
    normal: path.join(process.cwd(), 'node_modules/pdfmake/build/vfs_fonts.js'),
    bold: path.join(process.cwd(), 'node_modules/pdfmake/build/vfs_fonts.js'),
    italics: path.join(process.cwd(), 'node_modules/pdfmake/build/vfs_fonts.js'),
    bolditalics: path.join(process.cwd(), 'node_modules/pdfmake/build/vfs_fonts.js'),
  },
};

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  private getPrinter() {
    // Utilise pdfmake en mode server-side
    const PdfPrinter = require('pdfmake/src/printer');
    return new PdfPrinter(fontDescriptors);
  }

  private async generatePdf(docDefinition: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const printer = this.getPrinter();
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', reject);
        pdfDoc.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  private headerSRBHM() {
    return [
      { text: 'RÉPUBLIQUE DE MADAGASCAR', style: 'header', alignment: 'center' },
      { text: 'Ministère de l\'Économie et des Finances', alignment: 'center', fontSize: 10 },
      { text: 'Direction du Patrimoine de l\'État – Service Régional du Budget – Haute Matsiatra', alignment: 'center', fontSize: 9 },
      { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1 }] },
      { text: '', margin: [0, 5] },
    ];
  }

  // ==================== ATTESTATION DE NON-LOGEMENT ====================
  async generateAttestationPdf(attestationId: string): Promise<Buffer> {
    const attestation = await this.prisma.attestation.findUnique({
      where: { id: attestationId },
      include: {
        demandeur: true,
        createdBy: { select: { nom: true, prenom: true, matricule: true } },
      },
    });
    if (!attestation) throw new NotFoundException('Attestation non trouvée');

    const date = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const docDefinition: any = {
      content: [
        ...this.headerSRBHM(),
        { text: 'ATTESTATION DE NON-LOGEMENT', style: 'title', alignment: 'center', margin: [0, 20, 0, 20] },
        {
          text: [
            'Je soussigné(e), Chef du Service Régional du Budget Haute Matsiatra, certifie que ',
            { text: `${attestation.demandeur.nom} ${attestation.demandeur.prenom}`, bold: true },
            `, Matricule Solde : `,
            { text: attestation.demandeur.matricule, bold: true },
            ', exerçant la fonction de ',
            { text: attestation.demandeur.fonction ?? '_______________', bold: true },
            ' au ',
            { text: attestation.demandeur.ministere ?? '_______________', bold: true },
            ', ',
            { text: 'ne bénéficie d\'aucun logement de fonction, ni d\'aucun avantage logement en nature ou en indemnité', bold: true, decoration: 'underline' },
            ' à la date de ce jour.',
          ],
          margin: [0, 0, 0, 20],
          lineHeight: 1.5,
        },
        {
          text: 'Cette attestation est délivrée pour servir et valoir ce que de droit.',
          margin: [0, 0, 0, 40],
        },
        {
          columns: [
            { text: '', width: '*' },
            {
              stack: [
                { text: `Fianarantsoa, le ${date}`, alignment: 'right' },
                { text: 'Le Chef du Service Régional du Budget', alignment: 'right', margin: [0, 5] },
                { text: 'Haute Matsiatra', alignment: 'right' },
                { text: '\n\n\n[Signature et Cachet]', alignment: 'right', italics: true, color: '#888' },
              ],
            },
          ],
        },
        {
          text: `Référence : ${attestation.reference} | Généré le : ${date}`,
          fontSize: 8, color: '#aaa', margin: [0, 40, 0, 0], alignment: 'center',
        },
      ],
      styles: {
        header: { fontSize: 12, bold: true },
        title: { fontSize: 16, bold: true },
      },
      pageMargins: [60, 60, 60, 60],
    };

    const buffer = await this.generatePdf(docDefinition);

    // Sauvegarder l'URL dans la base
    const filename = `attestation-${attestation.reference}-${Date.now()}.pdf`;
    const filepath = path.join(process.cwd(), 'uploads', filename);
    fs.writeFileSync(filepath, buffer);
    await this.prisma.attestation.update({
      where: { id: attestationId },
      data: { pdfUrl: `/uploads/${filename}` },
    });

    return buffer;
  }

  // ==================== QUITUS DE RECENSEMENT (Conforme Modèle Officiel SRBHM) ====================
  async generateQuitusPdf(quitusId: string): Promise<Buffer> {
    const quitus = await this.prisma.quitus.findUnique({
      where: { id: quitusId },
      include: {
        bien: true,
        occupant: true,
        campagne: true,
        createdBy: { select: { nom: true, prenom: true, matricule: true } },
      },
    });
    if (!quitus) throw new NotFoundException('Quitus non trouvé');

    const date = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const numRef = quitus.reference.includes('MEF')
      ? quitus.reference
      : `${quitus.reference}/${quitus.annee}-MEF/SG/DGBF/DB/SRB/HM.`;

    const utilisateurOuMinistere = quitus.occupant
      ? `${quitus.occupant.fonction || 'le responsable'} (${quitus.occupant.ministere || 'Ministère'})`
      : quitus.bien.utilisateurDuBien || 'le Service/Direction responsable';

    const docDefinition: any = {
      content: [
        // En-tête national République de Madagascar
        { text: 'REPOBLIKAN\'I MADAGASCAR', style: 'republique', alignment: 'center' },
        { text: 'Fitiavana - Tanindrazana - Fandrosoana', style: 'devise', alignment: 'center', margin: [0, 0, 0, 15] },

        // Bloc Ministère (Gauche)
        {
          columns: [
            {
              width: 320,
              stack: [
                { text: 'MINISTERE DE L\'ECONOMIE ET DES FINANCES', bold: true, fontSize: 9 },
                { text: 'SECRETARIAT GENERAL', fontSize: 9 },
                { text: 'DIRECTION GENERALE DU BUDGET ET DES FINANCES', fontSize: 8.5 },
                { text: 'DIRECTION DU BUDGET', fontSize: 8.5 },
                { text: 'SERVICE REGIONAL DU BUDGET', bold: true, fontSize: 9 },
                { text: 'HAUTE MATSIATRA', bold: true, fontSize: 9 },
                { text: 'FIANARANTSOA', fontSize: 9 },
                { text: 'ooooooooooooooooooooo', fontSize: 8, margin: [0, 2, 0, 15] },
              ],
            },
            { width: '*', text: '' }
          ]
        },

        // Titre Principal
        { text: `QUITUS n° ${numRef}`, style: 'quitusTitle', alignment: 'center', margin: [0, 10, 0, 5] },
        {
          text: 'Attestant la réception de dossier de recensement des logements et Bâtiments administratifs.',
          alignment: 'center',
          italics: true,
          fontSize: 10,
          margin: [0, 0, 0, 25]
        },

        // Corps du texte
        {
          text: [
            'Le Chef du Service Régional du Budget de la Haute Matsiatra atteste que ',
            { text: utilisateurOuMinistere, bold: true },
            ' a déposé le dossier de recensement des bâtiments administratifs relevant de son domaine :'
          ],
          lineHeight: 1.4,
          fontSize: 11,
          margin: [0, 0, 0, 15]
        },

        // Détails des biens recensés
        {
          ul: [
            `Bien : ${quitus.bien.nomDuBien} (${quitus.bien.typeBien.replace(/_/g, ' ')})`,
            `Adresse / Localisation : ${quitus.bien.adresse}${quitus.bien.localite ? ', ' + quitus.bien.localite : ''}`,
            `N° d'inventaire : ${quitus.bien.numeroBien}`,
            `État de la bâtisse : ${quitus.etatBatiment || quitus.bien.etatBatisse || 'BON'}`
          ],
          lineHeight: 1.4,
          fontSize: 10.5,
          margin: [15, 0, 0, 15]
        },

        // Remarque sur l'entretien
        {
          text: 'Les bureaux nécessitant l\'entretien se sont figurés dans le dossier de recensement ci-dessus.',
          fontSize: 11,
          lineHeight: 1.4,
          margin: [0, 10, 0, 20]
        },

        ...(quitus.observations ? [
          { text: `Observations particulières : ${quitus.observations}`, italics: true, fontSize: 10, margin: [0, 0, 0, 20] }
        ] : []),

        // Block Signature
        {
          columns: [
            { text: '', width: '*' },
            {
              width: 250,
              stack: [
                { text: `Fianarantsoa le, ${date}`, alignment: 'right', fontSize: 10.5 },
                { text: 'Le Chef du Service Régional du Budget', alignment: 'right', bold: true, fontSize: 10.5, margin: [0, 5, 0, 0] },
                { text: 'Haute Matsiatra', alignment: 'right', fontSize: 10 },
                { text: '\n\n\n\n[Signature et Cachet Officiel]', alignment: 'right', italics: true, color: '#666', fontSize: 9 }
              ]
            }
          ]
        }
      ],
      styles: {
        republique: { fontSize: 10, bold: true },
        devise: { fontSize: 8.5, italics: true },
        quitusTitle: { fontSize: 14, bold: true }
      },
      pageMargins: [50, 40, 50, 40]
    };

    const buffer = await this.generatePdf(docDefinition);
    const filename = `quitus-${quitus.reference}-${Date.now()}.pdf`;
    const filepath = path.join(process.cwd(), 'uploads', filename);
    fs.writeFileSync(filepath, buffer);
    await this.prisma.quitus.update({
      where: { id: quitusId },
      data: { pdfUrl: `/uploads/${filename}`, statut: 'GENERE' },
    });

    return buffer;
  }

  // ==================== ÉTAT DES LIEUX ====================
  async generateEtatDesLieuxPdf(occupationId: string, type: 'ENTREE' | 'SORTIE'): Promise<Buffer> {
    const occupation = await this.prisma.occupation.findUnique({
      where: { numeroOccupation: occupationId },
      include: {
        bien: true,
        occupant: true,
      },
    });
    if (!occupation) throw new NotFoundException('Occupation non trouvée');

    const etatData = type === 'ENTREE' ? occupation.etatDesLieuxEntree : occupation.etatDesLieuxSortie;
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    const docDefinition: any = {
      content: [
        ...this.headerSRBHM(),
        {
          text: `ÉTAT DES LIEUX D'${type === 'ENTREE' ? 'ENTRÉE' : 'SORTIE'} ET PASSATION DES CLÉS`,
          style: 'title', alignment: 'center', margin: [0, 20, 0, 20],
        },
        {
          table: {
            widths: ['40%', '60%'],
            body: [
              ['Bien', { text: `${occupation.bien.nomDuBien} (${occupation.bien.numeroBien})`, bold: true }],
              ['Adresse', occupation.bien.adresse],
              ['Occupant', occupation.occupant ? `${occupation.occupant.nom} ${occupation.occupant.prenom}` : 'N/A'],
              ['Matricule', occupation.occupant?.matricule ?? '-'],
              ["Date d'entrée", occupation.dateEntree ? new Date(occupation.dateEntree).toLocaleDateString('fr-FR') : '-'],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 20],
        },
        {
          text: 'CONSTAT',
          bold: true, fontSize: 12, margin: [0, 10, 0, 5],
        },
        {
          text: etatData
            ? JSON.stringify(etatData, null, 2)
            : 'Aucune donnée d\'état des lieux renseignée.',
          margin: [0, 0, 0, 30],
          fontSize: 10,
        },
        {
          columns: [
            {
              stack: [
                { text: 'L\'Occupant', bold: true },
                { text: '\n\n\n[Signature]', italics: true, color: '#888' },
              ],
            },
            {
              stack: [
                { text: 'Le Chef SRB', bold: true },
                { text: '\n\n\n[Signature et Cachet]', italics: true, color: '#888' },
              ],
            },
          ],
        },
        { text: `Fianarantsoa, le ${date}`, alignment: 'center', margin: [0, 30, 0, 0] },
      ],
      styles: {
        header: { fontSize: 12, bold: true },
        title: { fontSize: 14, bold: true },
      },
      pageMargins: [60, 60, 60, 60],
    };

    return this.generatePdf(docDefinition);
  }

  // ==================== CONTRAT DE BAIL (Modèle Officiel MEF/DPE) ====================
  async generateContratBailPdf(numeroBail: string): Promise<Buffer> {
    const bail = await this.prisma.bail.findUnique({
      where: { numeroBail },
      include: {
        bien: true,
        locataire: true,
      },
    });
    if (!bail) throw new NotFoundException('Contrat de bail non trouvé');

    const dateStr = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const montantMensuel = bail.montantLoyer || 0;
    const montantAnnuel = montantMensuel * 12;

    const ministereLocataire = bail.locataire.ministere || 'Ministère de l\'Économie et des Finances';
    const nomBailleur = bail.nomBailleur || '...............................';
    const ribBailleur = bail.ribBailleur || '...............................';
    const adresseBien = bail.bien.adresse || '...............................';
    const nomLocataire = `${bail.locataire.nom} ${bail.locataire.prenom}`;
    const fonctionLocataire = bail.locataire.fonction || 'Fonctionnaire';
    const typeBien = bail.bien.typeBien ? bail.bien.typeBien.replace(/_/g, ' ') : 'Bureau';

    // Durée en mois / années
    const diffTime = Math.abs(new Date(bail.dateFin).getTime() - new Date(bail.dateDebut).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const dureeTexte = diffDays >= 360 ? `${Math.round(diffDays / 365)} an(s)` : `${Math.round(diffDays / 30)} mois`;

    const docDefinition: any = {
      content: [
        // En-tête national
        { text: 'REPOBLIKAN\'I MADAGASIKARA', style: 'republique', alignment: 'center' },
        { text: 'Fitiavana - Tanindrazana - Fandrosoana', style: 'devise', alignment: 'center', margin: [0, 0, 0, 5] },
        { canvas: [{ type: 'line', x1: 200, y1: 0, x2: 315, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 10] },

        // Bloc Imputation et Ministère
        {
          columns: [
            {
              width: 280,
              stack: [
                { text: `MINISTERE DE : ${ministereLocataire.toUpperCase()}`, bold: true, fontSize: 8.5 },
                { text: 'SG : ...........................................', fontSize: 8 },
                { text: 'DG : ...........................................', fontSize: 8 },
                { text: '................................................', fontSize: 8, margin: [0, 0, 0, 10] },
              ],
            },
            {
              width: '*',
              stack: [
                { text: 'IMPUTATION : .................................', fontSize: 8.5 },
                { text: 'Compte n° : .................................', fontSize: 8.5 },
                { text: `Exercice : ${new Date(bail.dateDebut).getFullYear()}`, fontSize: 8.5 },
              ],
            },
          ],
        },

        // Titre CONTRAT DE BAIL
        { text: `CONTRAT DE BAIL N° ${bail.numeroBail}`, style: 'bailTitle', alignment: 'center', margin: [0, 10, 0, 15] },

        // Préambule
        {
          text: [
            `Entre le `,
            { text: ministereLocataire.toUpperCase(), bold: true },
            ` agissant par délégation du Président de la République de Madagasikara et représenté par Le Chef du Service Régional du Budget, sis à Fianarantsoa désigné ci-après, le `,
            { text: 'Preneur', bold: true },
            `.\n`,
            { text: '       D\'une part\n', italics: true },
            `                 Et `,
            { text: nomBailleur, bold: true },
            ` élisant domicile au ${bail.bien.localite || 'Fianarantsoa'} désigné(e) ci-après `,
            { text: 'Le Bailleur', bold: true },
            `.\n`,
            { text: '       D\'autre part\n', italics: true },
          ],
          fontSize: 10,
          lineHeight: 1.3,
          margin: [0, 0, 0, 10],
        },

        { text: 'IL A ETE ARRETE ET CONVENU CE QUI SUIT', bold: true, alignment: 'center', fontSize: 10, margin: [0, 5, 0, 10] },

        // Article 1
        { text: 'Article premier. NATURE - OBJET DU BAIL - DESTINATION DES LOCAUX LOUES', style: 'articleTitle' },
        {
          text: [
            { text: nomBailleur, bold: true },
            ` loue au Gouvernement de la République de Madagasikara qui accepte un immeuble à usage de ${typeBien} sis au lot `,
            { text: adresseBien, bold: true },
            ` pour servir de ${typeBien} de `,
            { text: `${nomLocataire} (${fonctionLocataire})`, bold: true },
            ` auprès du `,
            { text: ministereLocataire, bold: true },
            `.`,
          ],
          style: 'articleBody',
        },

        // Article 2
        { text: 'Article 2. ETAT DES LIEUX DE L\'ENTREE EN OCCUPATION', style: 'articleTitle' },
        {
          text: 'Avant l\'occupation, un état des lieux sera dressé contradictoirement entre le Bailleur et le représentant de l\'Administration. Un inventaire du mobilier existant sera établi le cas échéant.',
          style: 'articleBody',
        },

        // Article 3
        { text: 'Article 3. OBLIGATIONS DES PARTIES', style: 'articleTitle' },
        {
          text: 'Le présent bail est consenti aux charges et conditions suivantes, que chaque partie s\'engage à exécuter et respecter.\nLe Bailleur s\'engage à :\n• mettre les locaux loués à la disposition du Preneur pendant toute la durée du bail et prendre en charge les grosses réparations incombant au propriétaire selon les textes en vigueur.\n• permettre au Preneur d\'exercer la plénitude de ses droits, notamment la possibilité d\'accéder au site à tout instant, et la possibilité aux autorités de tutelle d\'accéder au site afin d\'assurer le contrôle des lieux.\n• informer le Preneur de tout changement sur la situation de la propriété, notamment en cas d\'une inscription hypothécaire dans le Certificat d\'Immatriculation et de Situation Juridique pouvant impliquer le locataire.\n\nLe Preneur s\'engage à :\n• n\'exercer dans les locaux loués que l\'activité décrite dans l\'article premier;\n• acquitter toutes les charges lui incombant et dont il pourrait être rendu responsable à un titre quelconque, ainsi que les diverses factures (eau, électricité, internet, téléphone...) durant toutes les périodes locatives de telle sorte que le Bailleur ne soit jamais inquiété à ce sujet, et d\'en justifier le paiement à toute réquisition;\n• faire des réparations locatives, améliorations et installations intérieures et extérieures qu\'il jugera utiles mais à ses propres frais sans aucune demande de diminution ou indemnité sur le loyer et avec autorisation du Bailleur.\n• remettre à l\'état initial le lieu loué à la fin du bail, à moins que le Bailleur accepte de garder tous les travaux d\'aménagement, de construction et de séparations effectuées sur les lieux loués. Dans ce cas, ils resteront la propriété du Bailleur.',
          style: 'articleBody',
        },

        // Page break si nécessaire avant articles 4 et 5 pour respecter le NB
        { text: '', pageBreak: 'after' },

        // Article 4 (sur la même page que le cadre de signature)
        { text: 'Article 4. DUREE ET DATE D\'EFFET', style: 'articleTitle' },
        {
          text: `La location est faite à durée déterminée de ${dureeTexte} renouvelable et prendra effet à compter de la date d'approbation du présent contrat.`,
          style: 'articleBody',
        },

        // Article 5
        { text: 'Article 5. LOYER', style: 'articleTitle' },
        {
          text: `Le prix annuel de la location est de ${montantAnnuel.toLocaleString('fr-FR')} Ariary soit ${montantMensuel.toLocaleString('fr-FR')} Ariary par mois toutes taxes et charges comprises payables à terme échu mensuellement en un mandat sur le trésor par virement bancaire au compte n° ${ribBailleur} au nom de ${nomBailleur}.`,
          style: 'articleBody',
        },

        // Article 6
        { text: 'Article 6. RESILIATION', style: 'articleTitle' },
        {
          text: 'La résiliation pourra être demandée à tout moment moyennant un préavis d\'un mois pour l\'Administration et de trois mois pour le Bailleur.',
          style: 'articleBody',
        },

        // Article 7
        { text: 'Article 7. CESSION ET SOUS LOCATION', style: 'articleTitle' },
        {
          text: 'Toute cession du droit au présent bail ainsi que toute sous location totale ou partielle sont interdites sous peine de résiliation immédiate du bail.',
          style: 'articleBody',
        },

        // Article 8
        { text: 'Article 8. LITIGE', style: 'articleTitle' },
        {
          text: 'Tout différend relatif aux termes du présent bail devra faire l\'objet d\'une tentative de règlement à l\'amiable entre les parties. A défaut d\'accord amiable, les parties attribuent exclusivement compétence, pour tout litige concernant le bail ou ses conséquences au Tribunal territorialement compétent.',
          style: 'articleBody',
        },

        // Article 9
        { text: 'Article 9. APPROBATION', style: 'articleTitle' },
        {
          text: 'Pour être valable, le présent contrat de bail doit être soumis à l\'Approbation de la Direction du Patrimoine de l\'Etat ou de son représentant régional agissant par délégation du Ministre chargé de l\'Economie et des Finances.\nLe Preneur et le Bailleur font élection de domicile aux adresses indiquées à l\'introduction du présent bail.',
          style: 'articleBody',
        },

        { text: 'Dont acte', italics: true, margin: [0, 10, 0, 5] },
        { text: `Fait à Fianarantsoa, le ${dateStr}`, alignment: 'right', margin: [0, 0, 0, 15] },

        // Bloc Signatures (sur la même page que 4 & 5)
        {
          columns: [
            {
              width: 170,
              stack: [
                { text: 'Le Bailleur', bold: true, alignment: 'center' },
                { text: '"Lu et accepté"', italics: true, alignment: 'center', fontSize: 8.5 },
                { text: '\n\n\n[Signature - Nom et Prénoms]', italics: true, color: '#666', alignment: 'center', fontSize: 8.5 },
              ],
            },
            {
              width: 170,
              stack: [
                { text: 'Le Preneur', bold: true, alignment: 'center' },
                { text: '\n\n\n\n[Signature et Cachet]', italics: true, color: '#666', alignment: 'center', fontSize: 8.5 },
              ],
            },
            {
              width: '*',
              stack: [
                { text: 'Approbation n°............', bold: true, alignment: 'center' },
                { text: '(Cadre réservé à la DPE ou SRB)', fontSize: 7.5, italics: true, alignment: 'center' },
                { text: '\n\n\n[Visa et Approbation]', italics: true, color: '#666', alignment: 'center', fontSize: 8.5 },
              ],
            },
          ],
          margin: [0, 10, 0, 0],
        },
      ],
      styles: {
        republique: { fontSize: 9.5, bold: true },
        devise: { fontSize: 8, italics: true },
        bailTitle: { fontSize: 13, bold: true },
        articleTitle: { fontSize: 9.5, bold: true, margin: [0, 6, 0, 2] },
        articleBody: { fontSize: 9, lineHeight: 1.25, margin: [0, 0, 0, 4] },
      },
      pageMargins: [45, 35, 45, 35],
    };

    const buffer = await this.generatePdf(docDefinition);
    const filename = `contrat-bail-${bail.numeroBail}-${Date.now()}.pdf`;
    const filepath = path.join(process.cwd(), 'uploads', filename);
    fs.writeFileSync(filepath, buffer);
    await this.prisma.bail.update({
      where: { numeroBail },
      data: { contratPdfUrl: `/uploads/${filename}` },
    });

    return buffer;
  }
}
