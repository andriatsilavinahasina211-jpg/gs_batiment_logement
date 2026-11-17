import { lastValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

describe('AuditInterceptor', () => {
  const log = jest.fn();
  const interceptor = new AuditInterceptor({ log } as unknown as AuditService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['POST', 'CREATE'],
    ['PUT', 'UPDATE'],
    ['PATCH', 'UPDATE'],
    ['DELETE', 'DELETE'],
  ])('records successful %s actions as %s', async (method, action) => {
    const request = {
      method,
      path: '/dashboard/biens/B-1',
      route: { path: '/dashboard/biens/:numeroBien' },
      baseUrl: '',
      params: { numeroBien: 'B-1' },
      user: { id: 7, role: 'AGENT' },
    };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => request }),
    };
    const next = { handle: () => of({ success: true }) };

    await expect(
      lastValueFrom(interceptor.intercept(context as never, next as never)),
    ).resolves.toEqual({ success: true });

    expect(log).toHaveBeenCalledWith({
      userId: 7,
      action,
      entite: '/dashboard/biens/:numeroBien',
      entiteId: 'B-1',
      details: {
        method,
        route: '/dashboard/biens/:numeroBien',
      },
    });
  });

  it.each([
    ['GET', { id: 7, role: 'AGENT' }],
    ['PATCH', { id: 7, role: 'ADMINISTRATEUR' }],
    ['POST', { id: 7, role: 'CHEF_SRB' }],
  ])(
    'does not audit %s requests for non-write or excluded routes',
    async (method, user) => {
      const request = {
        method,
        path: method === 'POST' ? '/auth/login' : '/dashboard/biens/B-1',
        route: { path: '/dashboard/biens/:numeroBien' },
        baseUrl: '',
        params: { numeroBien: 'B-1' },
        user,
      };
      const context = {
        getType: () => 'http',
        switchToHttp: () => ({ getRequest: () => request }),
      };
      const next = { handle: () => of({ success: true }) };

      await lastValueFrom(
        interceptor.intercept(context as never, next as never),
      );

      expect(log).not.toHaveBeenCalled();
    },
  );
});
