/**
 * Helpers partages pour les routes Express - NormX
 */

import { Request, Response } from 'express';

export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return (err as { message?: string }).message || 'Erreur inconnue';
  }
  return String(err);
}

export function getTenantSchema(req: Request, res: Response): string | null {
  const schema = req.tenantSchema as string;
  if (!schema) {
    res.status(400).json({ error: 'Contexte tenant manquant.' });
    return null;
  }
  return schema;
}
