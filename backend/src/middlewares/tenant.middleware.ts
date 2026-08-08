import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/api-response';

export const enforceTenantIsolation = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    return next();
  }

  const tenantId = req.user?.restaurantId || req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    return ApiResponse.error(res, 'Tenant context missing from request', null, 400);
  }

  req.restaurantId = tenantId;
  next();
};
