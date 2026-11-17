import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const AUDITED_ROLES: ('AGENT' | 'CHEF_SRB')[] = ['AGENT', 'CHEF_SRB'];

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId: number;
    action: string;
    entite: string;
    entiteId?: string;
    details?: Prisma.InputJsonValue;
  }) {
    const { userId, action, entite, entiteId, details } = params;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== 'AGENT' && user.role !== 'CHEF_SRB')) {
      return null;
    }

    return this.prisma.auditLog.create({
      data: {
        action,
        entite,
        entiteId,
        ...(details !== undefined ? { details } : {}),
        user: { connect: { id: userId } },
      },
    });
  }

  // Récupérer tous les journaux avec filtres et pagination
  async findAll(filters: {
    userId?: number;
    entite?: string;
    action?: string;
    search?: string;
    dateDebut?: string;
    dateFin?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      user: {
        is: {
          role: { in: AUDITED_ROLES },
        },
      },
    };

    if (filters.userId !== undefined) {
      where.userId = filters.userId;
    }

    if (filters.entite) {
      where.entite = {
        contains: filters.entite,
        mode: 'insensitive',
      };
    }

    if (filters.action) {
      where.action = {
        contains: filters.action,
        mode: 'insensitive',
      };
    }

    if (filters.dateDebut || filters.dateFin) {
      where.createdAt = {
        ...(filters.dateDebut ? { gte: new Date(filters.dateDebut) } : {}),
        ...(filters.dateFin ? { lte: new Date(filters.dateFin) } : {}),
      };
    }

    if (filters.search?.trim()) {
      const search = filters.search.trim();

      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entite: { contains: search, mode: 'insensitive' } },
        { entiteId: { contains: search, mode: 'insensitive' } },
        {
          user: {
            is: {
              OR: [
                { nom: { contains: search, mode: 'insensitive' } },
                { prenom: { contains: search, mode: 'insensitive' } },
                { matricule: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              nom: true,
              prenom: true,
              matricule: true,
              role: true,
            },
          },
        },
      }),

      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByEntite(entite: string, entiteId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entite,
        entiteId,
        user: {
          is: {
            role: { in: AUDITED_ROLES },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            nom: true,
            prenom: true,
            matricule: true,
          },
        },
      },
    });
  }
}
