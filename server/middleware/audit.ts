import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import { getValidatedSchemaName } from '../utils/tenant.utils';

interface AuditEntry {
  utilisateur_id: string | null;
  action: string;
  module: string;
  entite: string;
  entite_id: string;
  details: Record<string, string | number | boolean | null>;
  ip_address: string;
}

export async function logAudit(schema: string, entry: AuditEntry): Promise<void> {
  const s = getValidatedSchemaName(schema);
  await pool.query(
    `INSERT INTO "${s}".audit_log (utilisateur_id, action, module, entite, entite_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [entry.utilisateur_id, entry.action, entry.module, entry.entite, entry.entite_id, JSON.stringify(entry.details), entry.ip_address]
  );
}

// Middleware factory for automatic audit logging
export function auditMiddleware(module: string, entite: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);

    res.json = function (body: Record<string, string | number | boolean | null>) {
      // Determine action from HTTP method
      const actionMap: Record<string, string> = {
        GET: 'read',
        POST: 'create',
        PUT: 'update',
        DELETE: 'delete',
      };
      const action = actionMap[req.method] || req.method.toLowerCase();

      const tenantSchema = (req as { tenantSchema?: string }).tenantSchema;
      const user = (req as { user?: { sub: string } }).user;

      if (tenantSchema && res.statusCode < 400) {
        const entry: AuditEntry = {
          utilisateur_id: user?.sub || null,
          action,
          module,
          entite,
          entite_id: req.params.id || '',
          details: { method: req.method, path: req.path, status: res.statusCode },
          ip_address: req.ip || req.socket.remoteAddress || '',
        };
        // Fire and forget — don't block the response
        logAudit(tenantSchema, entry).catch(() => {});
      }

      return originalJson(body);
    };

    next();
  };
}
