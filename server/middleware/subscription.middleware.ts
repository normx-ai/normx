import { Request, Response, NextFunction } from 'express';

export function requireSubscription(product: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const subs = req.user?.subscriptions || [];
    if (!subs.includes(product)) {
      res.status(403).json({
        error: 'Abonnement requis.',
        product,
        code: 'SUBSCRIPTION_REQUIRED',
      });
      return;
    }
    next();
  };
}
