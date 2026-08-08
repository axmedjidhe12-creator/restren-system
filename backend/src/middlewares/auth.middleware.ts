import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.config';
import { ApiResponse } from '../utils/api-response';
import { Role } from '@prisma/client';

export interface AuthUserPayload {
  id: string;
  email: string;
  role: Role;
  restaurantId?: string | null;
  branchId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      restaurantId?: string;
    }
  }
}

export const authenticateJwt = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.error(res, 'Authorization token missing or invalid format', null, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    if (decoded.restaurantId) {
      req.restaurantId = decoded.restaurantId;
    }
    next();
  } catch (error) {
    return ApiResponse.error(res, 'Invalid or expired authorization token', null, 401);
  }
};

export const authorizeRoles = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponse.error(res, 'User identity unauthenticated', null, 401);
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(res, 'Access forbidden: Insufficient permissions', null, 403);
    }

    next();
  };
};
