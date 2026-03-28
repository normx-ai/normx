/**
 * Augmentation globale de Express.Request pour le multi-tenant NormX
 */

import type { Tenant } from '../services/tenant.service';
import type { UserToken } from '../middleware/auth';

declare global {
  namespace Express {
    interface Request {
      user?: UserToken;
      tenant?: Tenant;
      tenantSchema?: string;
      isCabinetUser?: boolean;
      accessibleTenants?: number[];
    }
  }
}
