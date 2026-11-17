import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, mergeMap } from 'rxjs';
import { AuditService } from './audit.service';

type AuthenticatedRequest = {
  method: string;
  path: string;
  baseUrl?: string;
  route?: { path?: string | string[] };
  params?: Record<string, unknown>;
  user?: {
    id?: number;
    userId?: number;
    sub?: number;
    role?: string;
  };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = request.method.toUpperCase();

    if (
      !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ||
      (request.user?.role !== 'AGENT' && request.user?.role !== 'CHEF_SRB') ||
      request.path.split('/').includes('auth')
    ) {
      return next.handle();
    }

    const routePath =
      typeof request.route?.path === 'string'
        ? `${request.baseUrl ?? ''}${request.route.path}`
        : request.path;
    const entiteId = Object.values(request.params ?? {}).find(
      (value): value is string => typeof value === 'string',
    );
    const action =
      method === 'POST' ? 'CREATE' : method === 'DELETE' ? 'DELETE' : 'UPDATE';
    const userId =
      request.user?.id ?? request.user?.userId ?? request.user?.sub;
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        if (typeof userId === 'number' && Number.isInteger(userId)) {
          await this.auditService.log({
            userId,
            action,
            entite: routePath,
            entiteId,
            details: { method, route: routePath },
          });
        }

        return result;
      }),
    );
  }
}
