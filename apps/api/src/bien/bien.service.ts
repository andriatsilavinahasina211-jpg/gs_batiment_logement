import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BienQueryDto } from './dto/bien-query.dto';
import { UpdateBienDto } from './dto/update-bien.dto';
import { CreateBienDto } from './dto/create-bien.dto';
import * as XLSX from 'xlsx';
import { StatutBien } from '@prisma/client';

@Injectable()
export class BiensService {
  constructor(private prisma: PrismaService) {}

  private generateNumeroBien(lastNumber: number): string {
    return `B-${(lastNumber + 1).toString().padStart(5, '0')}`;
  }

  // ==================== CRÉATION ====================
  async create(createBienDto: CreateBienDto, user: any) {
    if (!createBienDto.nomDuBien?.trim() || !createBienDto.adresse?.trim() || !createBienDto.typeBien) {
      throw new BadRequestException(
        'nomDuBien, adresse et typeBien sont obligatoires',
      );
    }

    const userId = user?.id ?? user?.userId ?? user?.sub;
    if (!userId || isNaN(Number(userId))) {
      throw new BadRequestException('Utilisateur non authentifié ou ID invalide');
    }

    let numeroBien = createBienDto.numeroBien?.trim().toUpperCase();

    // Génération automatique si vide
    if (!numeroBien) {
      const last = await this.prisma.bien.findFirst({
        orderBy: { numeroBien: 'desc' },
        select: { numeroBien: true },
      });
      const lastNum = last
        ? parseInt(last.numeroBien.split('-')[1] || '0', 10)
        : 0;
      numeroBien = this.generateNumeroBien(lastNum);
    }

    try {
      const bien = await this.prisma.bien.create({
        data: {
          numeroBien,
          nomDuBien: createBienDto.nomDuBien.trim(),
          typeBien: createBienDto.typeBien,
          utilisateurDuBien: createBienDto.utilisateurDuBien?.trim() || '',
          nature: createBienDto.nature || null,
          adresse: createBienDto.adresse.trim(),
          localite: createBienDto.localite?.trim() || null,
          etatBatisse: createBienDto.etatBatisse || 'BON',
          statut: createBienDto.statut || 'LIBRE',
          photos: createBienDto.photos || [],
          description: createBienDto.description?.trim() || null,
        },
      });

      return bien;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          `Le numéro de bien "${numeroBien}" existe déjà`,
        );
      }
      console.error('Erreur création bien:', error);
      throw new BadRequestException(
        error.message || 'Erreur lors de la création du bien',
      );
    }
  }

  // ==================== MISE À JOUR ====================
  async update(
    numeroBien: string,
    updateBienDto: UpdateBienDto,
    _userId: number,
  ) {
    await this.findOne(numeroBien);

    const newBien = await this.prisma.bien.update({
      where: { numeroBien },
      data: {
        ...updateBienDto,
        // On s'assure que les champs string sont bien nettoyés
        nomDuBien: updateBienDto.nomDuBien?.trim(),
        adresse: updateBienDto.adresse?.trim(),
        localite: updateBienDto.localite?.trim() || null,
        utilisateurDuBien: updateBienDto.utilisateurDuBien?.trim() || "",
        description: updateBienDto.description?.trim() || null,
      } as any,
    });

    return newBien;
  }

  // ==================== SUPPRESSION ====================
  async remove(numeroBien: string, _userId: number) {
    await this.findOne(numeroBien);

    await this.prisma.bien.delete({ where: { numeroBien } });

    return { message: `Bien ${numeroBien} supprimé avec succès` };
  }

  // ==================== IMPORT EXCEL ====================
  async importExcel(file: Express.Multer.File, userId: number) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const created: any[] = [];
    const errors: Array<{
      ligne: number;
      donnees: any;
      erreur: string;
    }> = [];

    for (const [index, row] of rows.entries()) {
      try {
        const bienData: CreateBienDto = {
          numeroBien: row['NumeroBien'] || row['numeroBien'],
          nomDuBien:
            row['NomDuBien'] ||
            row['nomDuBien'] ||
            `Bien Importé ${index + 1}`,
          typeBien: row['TypeBien'] || row['typeBien'],
          utilisateurDuBien:
            row['UtilisateurDuBien'] || row['utilisateurDuBien'],
          etatBatisse: row['EtatBatisse'] || row['etatBatisse'],
          nature: row['Nature'] || row['nature'],
          adresse: row['Adresse'] || row['adresse'],
          localite: row['Localite'] || row['localite'],
          statut: row['Statut'] || row['statut'] || StatutBien.LIBRE,
          description: row['Description'] || row['description'],
          photos: row['Photos']
            ? row['Photos']
                .toString()
                .split(',')
                .map((p: string) => p.trim())
                .filter(Boolean)
            : [],
        };

        // On passe un objet user compatible avec create()
        const bien = await this.create(bienData, { id: userId });
        created.push(bien);
      } catch (error: any) {
        errors.push({
          ligne: index + 2,
          donnees: row,
          erreur: error.message || error?.toString(),
        });
      }
    }

    return {
      success: true,
      message: `Import terminé : ${created.length} biens créés`,
      createdCount: created.length,
      errorsCount: errors.length,
      errors,
    };
  }

  // ==================== CONSULTATION ====================
  async findAll(query: BienQueryDto) {
    const {
      search,
      typeBien,
      statut,
      etatBatisse,
      localite,
      utilisateurDuBien,
      hasOccupation,
      orderBy = 'numeroBien',
      orderDirection = 'asc',
      page = 1,
      limit = 10,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { numeroBien: { contains: search, mode: 'insensitive' } },
        { nomDuBien: { contains: search, mode: 'insensitive' } },
        { adresse: { contains: search, mode: 'insensitive' } },
        { localite: { contains: search, mode: 'insensitive' } },
        { utilisateurDuBien: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (typeBien) where.typeBien = typeBien;
    if (statut) where.statut = statut;
    if (etatBatisse) where.etatBatisse = etatBatisse;
    if (localite) {
      where.localite = { contains: localite, mode: 'insensitive' };
    }
    if (utilisateurDuBien) {
      where.utilisateurDuBien = {
        contains: utilisateurDuBien,
        mode: 'insensitive',
      };
    }

    if (hasOccupation !== undefined) {
      where.occupations = hasOccupation ? { some: {} } : { none: {} };
    }

    const [data, total] = await Promise.all([
      this.prisma.bien.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: orderDirection },
        include: {
          occupations: {
            take: 1,
            orderBy: { dateEntree: 'desc' },
            include: { occupant: true },
          },
        },
      }),
      this.prisma.bien.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    };
  }

  //RECUPERATION D'UN BIEN 

  async findOne(numeroBien: string) {
    const bien = await this.prisma.bien.findUnique({
      where: { numeroBien },
      include: {
        occupations: { include: { occupant: true } },
        baux: { include: { locataire: true } },
        demandes: { include: { demandeur: true } },
      },
    });

    if (!bien) {
      throw new NotFoundException(`Bien ${numeroBien} non trouvé`);
    }

    return bien;
  }

  // ==================== HISTORIQUE D'UN BIEN ====================
  async getHistory(numeroBien: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entite: 'Bien',
        entiteId: numeroBien,
        user: { is: { role: { in: ['AGENT', 'CHEF_SRB'] } } },
      },
      include: {
        user: { select: { nom: true, prenom: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

    // ==================== CARTE (localités) ====================
  async findForMap() {
    return this.prisma.bien.findMany({
      where: {
        OR: [
          { localite: { not: null } },
          { adresse: { not: '' } },
        ],
      },
      select: {
        numeroBien: true,
        nomDuBien: true,
        adresse: true,
        localite: true,
        statut: true,
        typeBien: true,
        nature: true,
      },
      orderBy: { nomDuBien: 'asc' },
    });
  }

}