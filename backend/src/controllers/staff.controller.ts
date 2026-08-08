import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ApiResponse } from '../utils/api-response';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/** Generate a unique 4-digit waiter PIN for a restaurant */
async function generateUniqueWaiterCode(restaurantId: string): Promise<string> {
  let code: string;
  let exists = true;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000)); // 1000-9999
    const conflict = await prisma.user.findFirst({
      where: { restaurantId, waiterCode: code, isDeleted: false }
    });
    exists = !!conflict;
  } while (exists);
  return code;
}

/**
 * GET /api/v1/staff/waiters
 * List all waiters for this restaurant with assigned tables + stats
 */
export const listWaiters = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;

    const waiters = await prisma.user.findMany({
      where: {
        restaurantId,
        role: 'WAITER',
        isDeleted: false
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        waiterCode: true,
        isActive: true,
        createdAt: true,
        assignedTables: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return ApiResponse.success(res, 'Waiters retrieved', waiters);
  } catch (error) {
    logger.error('listWaiters error:', error);
    return ApiResponse.error(res, 'Failed to list waiters', error, 500);
  }
};

/**
 * POST /api/v1/staff/waiters
 * Create a new waiter account with auto-generated PIN code + assigned tables
 */
export const createWaiter = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { fullName, email, phone, branchId, tableIds } = req.body;

    if (!fullName || !phone || !branchId) {
      return ApiResponse.error(res, 'fullName, phone, and branchId are required', null, 400);
    }

    // Generate unique 4-digit PIN
    const waiterCode = await generateUniqueWaiterCode(restaurantId);

    // Default password = PIN (waiter logs in with email or PIN)
    const passwordHash = await bcrypt.hash(`WAITER${waiterCode}`, 12);

    // Generate a unique email if not provided
    const waiterEmail = email || `waiter${waiterCode}@${restaurantId.slice(0, 8)}.internal`;

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: waiterEmail } });
    if (existing) {
      return ApiResponse.error(res, 'Email already in use. Please provide a different email.', null, 409);
    }

    // Build assignedTables connection
    const tablesConnect = (tableIds as string[] || []).map((tid: string) => ({ id: tid }));

    const waiter = await prisma.user.create({
      data: {
        restaurantId,
        branchId,
        fullName,
        email: waiterEmail,
        phone,
        passwordHash,
        role: 'WAITER',
        waiterCode,
        isActive: true,
        assignedTables: { connect: tablesConnect }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        waiterCode: true,
        isActive: true,
        createdAt: true,
        assignedTables: {
          select: { id: true, tableNumber: true, capacity: true, status: true }
        }
      }
    });

    logger.info(`[Staff] Waiter ${fullName} created with code ${waiterCode} for restaurant ${restaurantId}`);
    return ApiResponse.success(res, `Waiter created. PIN Code: ${waiterCode}`, waiter, 201);
  } catch (error) {
    logger.error('createWaiter error:', error);
    return ApiResponse.error(res, 'Failed to create waiter', error, 500);
  }
};

/**
 * PATCH /api/v1/staff/waiters/:id
 * Update waiter info or reassign tables
 */
export const updateWaiter = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const { fullName, phone, isActive, tableIds } = req.body;

    const waiter = await prisma.user.findFirst({
      where: { id, restaurantId, role: 'WAITER', isDeleted: false }
    });

    if (!waiter) {
      return ApiResponse.error(res, 'Waiter not found', null, 404);
    }

    // Build table assignment update
    const tablesSet = Array.isArray(tableIds)
      ? { set: tableIds.map((tid: string) => ({ id: tid })) }
      : undefined;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(fullName && { fullName }),
        ...(phone && { phone }),
        ...(isActive !== undefined && { isActive }),
        ...(tablesSet && { assignedTables: tablesSet })
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        waiterCode: true,
        isActive: true,
        updatedAt: true,
        assignedTables: {
          select: { id: true, tableNumber: true, capacity: true, status: true }
        }
      }
    });

    return ApiResponse.success(res, 'Waiter updated', updated);
  } catch (error) {
    logger.error('updateWaiter error:', error);
    return ApiResponse.error(res, 'Failed to update waiter', error, 500);
  }
};

/**
 * DELETE /api/v1/staff/waiters/:id
 * Soft-delete a waiter (deactivate)
 */
export const deleteWaiter = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;

    const waiter = await prisma.user.findFirst({
      where: { id, restaurantId, role: 'WAITER' }
    });

    if (!waiter) {
      return ApiResponse.error(res, 'Waiter not found', null, 404);
    }

    await prisma.user.update({
      where: { id },
      data: { isDeleted: true, isActive: false, deletedAt: new Date() }
    });

    return ApiResponse.success(res, 'Waiter deactivated successfully');
  } catch (error) {
    logger.error('deleteWaiter error:', error);
    return ApiResponse.error(res, 'Failed to deactivate waiter', error, 500);
  }
};

/**
 * POST /api/v1/auth/waiter-login
 * PIN-based login for waiters: { waiterCode, restaurantSlug }
 */
export const waiterPinLogin = async (req: Request, res: Response) => {
  try {
    const { waiterCode, restaurantSlug } = req.body;

    if (!waiterCode || !restaurantSlug) {
      return ApiResponse.error(res, 'waiterCode and restaurantSlug are required', null, 400);
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug }
    });

    if (!restaurant) {
      return ApiResponse.error(res, 'Restaurant not found', null, 404);
    }

    const waiter = await prisma.user.findFirst({
      where: {
        waiterCode: String(waiterCode),
        restaurantId: restaurant.id,
        role: 'WAITER',
        isActive: true,
        isDeleted: false
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        waiterCode: true,
        restaurantId: true,
        branchId: true,
        assignedTables: {
          select: { id: true, tableNumber: true, capacity: true, status: true }
        }
      }
    });

    if (!waiter) {
      return ApiResponse.error(res, 'Invalid PIN code. Please check with your manager.', null, 401);
    }

    // Import JWT sign
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        userId: waiter.id,
        restaurantId: waiter.restaurantId,
        branchId: waiter.branchId,
        role: waiter.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '12h' }
    );

    logger.info(`[Auth] Waiter PIN login: ${waiter.fullName} (code: ${waiterCode})`);

    return ApiResponse.success(res, 'Waiter PIN login successful', {
      token,
      user: {
        ...waiter,
        restaurantSlug: restaurantSlug
      }
    });
  } catch (error) {
    logger.error('waiterPinLogin error:', error);
    return ApiResponse.error(res, 'PIN login failed', error, 500);
  }
};
