/**
 * Helpers partages pour les routes Express - NormX
 * Elimine la duplication dans les route handlers
 */

import { Request, Response } from 'express';
import logger from '../logger';

export function getErrorMessage(err: Error | { message?: string } | string | number | null | undefined): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return (err as { message?: string }).message || 'Erreur inconnue';
  }
  return String(err);
}

/**
 * Extrait et valide le schema tenant depuis la requete.
 * Retourne null et envoie 400 si absent.
 */
export function getTenantSchema(req: Request, res: Response): string | null {
  const schema = req.tenantSchema as string;
  if (!schema) {
    res.status(400).json({ error: 'Contexte tenant manquant.' });
    return null;
  }
  return schema;
}

/**
 * Gere les erreurs dans les route handlers.
 * Log l'erreur et retourne 500 avec un message generique.
 */
export function handleRouteError(res: Response, err: unknown, customMessage?: string): void {
  logger.error(getErrorMessage(err as { message?: string }));
  res.status(500).json({ error: customMessage || 'Erreur serveur.' });
}
