import { AuditService } from './audit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import type { Prisma } from '@prisma/client';

describe('AuditService', () => {
  const userFindUnique = jest.fn();
  const auditLogCreate = jest.fn();
  const findManyWhere: Prisma.AuditLogWhereInput[] = [];
  const countWhere: Prisma.AuditLogWhereInput[] = [];
  const auditLogFindMany = jest.fn(
    (args: { where?: Prisma.AuditLogWhereInput }) => {
      findManyWhere.push(args.where ?? {});
      return Promise.resolve([]);
    },
  );
  const auditLogCount = jest.fn(
    (args: { where?: Prisma.AuditLogWhereInput }) => {
      countWhere.push(args.where ?? {});
      return Promise.resolve(0);
    },
  );
  const prisma = {
    user: { findUnique: userFindUnique },
    auditLog: {
      create: auditLogCreate,
      findMany: auditLogFindMany,
      count: auditLogCount,
    },
  } as unknown as PrismaService;
  const service = new AuditService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    findManyWhere.length = 0;
    countWhere.length = 0;
  });

  it.each(['AGENT', 'CHEF_SRB'])('records actions for %s', async (role) => {
    userFindUnique.mockResolvedValue({ role });
    auditLogCreate.mockResolvedValue({ id: 'log-1' });

    await expect(
      service.log({
        userId: 7,
        action: 'UPDATE',
        entite: '/dashboard/biens/:numeroBien',
      }),
    ).resolves.toEqual({ id: 'log-1' });

    expect(auditLogCreate).toHaveBeenCalledTimes(1);
  });

  it('does not record actions for administrators', async () => {
    userFindUnique.mockResolvedValue({ role: 'ADMINISTRATEUR' });

    await expect(
      service.log({
        userId: 7,
        action: 'UPDATE',
        entite: '/dashboard/biens/:numeroBien',
      }),
    ).resolves.toBeNull();

    expect(auditLogCreate).not.toHaveBeenCalled();
  });

  it('excludes administrator logs from both history queries', async () => {
    await service.findAll({});
    await service.findByEntite('/dashboard/biens/:numeroBien', 'B-1');

    const allowedRoles = ['AGENT', 'CHEF_SRB'];

    expect(findManyWhere[0]?.user).toMatchObject({
      is: { role: { in: allowedRoles } },
    });
    expect(findManyWhere[1]?.user).toMatchObject({
      is: { role: { in: allowedRoles } },
    });
    expect(countWhere[0]?.user).toMatchObject({
      is: { role: { in: allowedRoles } },
    });
  });
});
