import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { TypePieceJointe } from '@prisma/client';

@Injectable()
export class PiecesJointesService {
  constructor(private prisma: PrismaService) {}

  async create(file: Express.Multer.File, body: any, userId: number) {
    // Vérifier CISJ < 3 mois si applicable
    let valide = true;
    if (body.typePiece === 'CISJ' && body.dateEmission) {
      const dateEmission = new Date(body.dateEmission);
      const troisMoisAvant = new Date();
      troisMoisAvant.setMonth(troisMoisAvant.getMonth() - 3);
      valide = dateEmission >= troisMoisAvant;
    }

    return this.prisma.pieceJointe.create({
      data: {
        nomFichier: file.originalname,
        url: `/uploads/${file.filename}`,
        typeMime: file.mimetype,
        taille: file.size,
        typePiece: body.typePiece ?? null,
        dateEmission: body.dateEmission ? new Date(body.dateEmission) : null,
        valide,
        bienNumero: body.bienNumero ?? null,
        demandeRef: body.demandeRef ?? null,
        bailNumero: body.bailNumero ?? null,
        travauxId: body.travauxId ?? null,
        uploadedById: userId,
      },
    });
  }

  async findAll(filters: {
    bienNumero?: string;
    demandeRef?: string;
    bailNumero?: string;
    travauxId?: string;
    typePiece?: TypePieceJointe;
  }) {
    return this.prisma.pieceJointe.findMany({
      where: {
        ...(filters.bienNumero ? { bienNumero: filters.bienNumero } : {}),
        ...(filters.demandeRef ? { demandeRef: filters.demandeRef } : {}),
        ...(filters.bailNumero ? { bailNumero: filters.bailNumero } : {}),
        ...(filters.travauxId ? { travauxId: filters.travauxId } : {}),
        ...(filters.typePiece ? { typePiece: filters.typePiece } : {}),
      },
      include: { uploadedBy: { select: { nom: true, prenom: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const pj = await this.prisma.pieceJointe.findUnique({
      where: { id },
      include: { uploadedBy: { select: { nom: true, prenom: true } } },
    });
    if (!pj) throw new NotFoundException('Pièce jointe non trouvée');
    return pj;
  }

  async remove(id: string) {
    const pj = await this.findOne(id);
    // Supprimer le fichier physique
    try {
      const filePath = path.join(process.cwd(), pj.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      // On continue même si le fichier physique est introuvable
    }
    return this.prisma.pieceJointe.delete({ where: { id } });
  }
}
