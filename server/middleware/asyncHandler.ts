import { Request, Response, NextFunction } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;

/**
 * Propage les erreurs au middleware central (server/index.ts) qui distingue
 * HttpError (metier, 4xx) et erreur imprevue (5xx). Pas de log local : evite
 * les doublons avec le handler central.
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
