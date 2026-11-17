import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOccupantDto } from './dto/create-occupant.dto';
import { UpdateOccupantDto } from './dto/update-occupant.dto';

@Injectable()
export class OccupantService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOccupantDto) {
    const existingMat = await this.prisma.occupant.findUnique({
      where: { matricule: dto.matricule },
    });
    if (existingMat) {
      throw new BadRequestException(`Un occupant existe déjà avec le matricule ${dto.matricule}`);
    }

    if (dto.cin) {
      const existingCin = await this.prisma.occupant.findUnique({
        where: { cin: dto.cin },
      });
      if (existingCin) {
        throw new BadRequestException(`Un occupant existe déjà avec le CIN ${dto.cin}`);
      }
    }

    return this.prisma.occupant.create({
      data: dto,
    });
  }

  async findAll(query: { search?: string; ministere?: string } = {}) {
    const where: any = {};
    if (query.ministere) {
      where.ministere = query.ministere;
    }
    if (query.search) {
      where.OR = [
        { nom: { contains: query.search, mode: 'insensitive' } },
        { prenom: { contains: query.search, mode: 'insensitive' } },
        { matricule: { contains: query.search, mode: 'insensitive' } },
        { cin: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.occupant.findMany({
      where,
      include: {
        occupations: true,
        baux: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const occupant = await this.prisma.occupant.findUnique({
      where: { occupanId: id },
      include: {
        occupations: true,
        baux: true,
        demandes: true,
      },
    });
    if (!occupant) {
      throw new NotFoundException(`Occupant #${id} non trouvé`);
    }
    return occupant;
  }

  async update(id: number, dto: UpdateOccupantDto) {
    await this.findOne(id);
    return this.prisma.occupant.update({
      where: { occupanId: id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.occupant.delete({
      where: { occupanId: id },
    });
  }
}
