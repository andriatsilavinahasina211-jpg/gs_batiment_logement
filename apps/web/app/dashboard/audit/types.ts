
export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown> | string | null;
  userNom: string;
  userMatricule?: string;
  userRole?: string;
  createdAt: string;
  ipAddress?: string;
}
