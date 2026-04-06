import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;

export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      logger.error(`[${req.method} ${req.path}] ${err instanceof Error ? err.message : String(err)}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur.' });
      }
    });
  };
}
