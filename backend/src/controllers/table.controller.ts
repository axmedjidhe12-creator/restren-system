import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../utils/prisma';
import { ApiResponse } from '../utils/api-response';
import { logger } from '../utils/logger';

const QR_BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * GET /api/v1/tables
 * List all tables for a branch.
 * Query: ?branchId=<id>
 */
export const getTables = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { branchId } = req.query;

    if (!branchId) {
      return ApiResponse.error(res, 'branchId query parameter is required', null, 400);
    }

    const tables = await prisma.restaurantTable.findMany({
      where: { restaurantId, branchId: String(branchId) },
      include: {
        assignedWaiter: { select: { id: true, fullName: true } }
      },
      orderBy: { tableNumber: 'asc' }
    });

    return ApiResponse.success(res, 'Tables retrieved', tables);
  } catch (error) {
    logger.error('getTables error:', error);
    return ApiResponse.error(res, 'Failed to fetch tables', error, 500);
  }
};

/**
 * POST /api/v1/tables
 * Create a new table and generate its unique QR code.
 */
export const createTable = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { branchId, tableNumber, capacity } = req.body;

    if (!branchId || !tableNumber) {
      return ApiResponse.error(res, 'branchId and tableNumber are required', null, 400);
    }

    // Verify branch belongs to this tenant
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, restaurantId }
    });

    if (!branch) {
      return ApiResponse.error(res, 'Branch not found or does not belong to your restaurant', null, 404);
    }

    // Check plan table limit
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { plan: true }
    });

    const tableCount = await prisma.restaurantTable.count({
      where: { restaurantId, branchId }
    });

    if (restaurant && tableCount >= restaurant.plan.maxTables) {
      return ApiResponse.error(
        res,
        `Your plan allows a maximum of ${restaurant.plan.maxTables} tables per branch. Please upgrade.`,
        null,
        403
      );
    }

    // Generate unique QR Code URL
    // Format: /r/<restaurantSlug>?branch=<branchId>&table=<tableNumber>
    const restaurantRecord = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    const qrTargetUrl = `${QR_BASE_URL}/r/${restaurantRecord?.slug}?branch=${branchId}&table=${tableNumber}`;

    // Generate QR code as a base64 data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrTargetUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' }
    });

    const table = await prisma.restaurantTable.create({
      data: {
        restaurantId,
        branchId,
        tableNumber: String(tableNumber),
        capacity: capacity ? Number(capacity) : 4,
        qrCodeUrl: qrCodeDataUrl
      }
    });

    return ApiResponse.success(res, 'Table created with QR code', table, 201);
  } catch (error) {
    logger.error('createTable error:', error);
    return ApiResponse.error(res, 'Failed to create table', error, 500);
  }
};

/**
 * PATCH /api/v1/tables/:id/status
 * Update table status (AVAILABLE, OCCUPIED, RESERVED, CLEANING).
 */
export const updateTableStatus = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const { status } = req.body;

    const VALID_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'];
    if (!status || !VALID_STATUSES.includes(status)) {
      return ApiResponse.error(res, `Status must be one of: ${VALID_STATUSES.join(', ')}`, null, 400);
    }

    const table = await prisma.restaurantTable.findFirst({
      where: { id, restaurantId }
    });

    if (!table) {
      return ApiResponse.error(res, 'Table not found', null, 404);
    }

    const updated = await prisma.restaurantTable.update({
      where: { id },
      data: { status: status as any }
    });

    return ApiResponse.success(res, 'Table status updated', updated);
  } catch (error) {
    logger.error('updateTableStatus error:', error);
    return ApiResponse.error(res, 'Failed to update table status', error, 500);
  }
};

/**
 * PATCH /api/v1/tables/:id/assign-waiter
 * Assign a waiter to a table.
 */
export const assignWaiter = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const { waiterId } = req.body;

    const table = await prisma.restaurantTable.findFirst({
      where: { id, restaurantId }
    });

    if (!table) {
      return ApiResponse.error(res, 'Table not found', null, 404);
    }

    if (waiterId) {
      const waiter = await prisma.user.findFirst({
        where: { id: waiterId, restaurantId, role: 'WAITER' }
      });

      if (!waiter) {
        return ApiResponse.error(res, 'Waiter not found or invalid role', null, 404);
      }
    }

    const updated = await prisma.restaurantTable.update({
      where: { id },
      data: { assignedWaiterId: waiterId || null },
      include: { assignedWaiter: { select: { id: true, fullName: true } } }
    });

    return ApiResponse.success(res, 'Waiter assigned to table', updated);
  } catch (error) {
    logger.error('assignWaiter error:', error);
    return ApiResponse.error(res, 'Failed to assign waiter', error, 500);
  }
};

/**
 * GET /api/v1/tables/:id/qr
 * Returns the QR code data URL for a specific table.
 */
export const getTableQr = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;

    const table = await prisma.restaurantTable.findFirst({
      where: { id, restaurantId }
    });

    if (!table) {
      return ApiResponse.error(res, 'Table not found', null, 404);
    }

    return ApiResponse.success(res, 'QR code retrieved', {
      tableNumber: table.tableNumber,
      qrCodeUrl: table.qrCodeUrl
    });
  } catch (error) {
    logger.error('getTableQr error:', error);
    return ApiResponse.error(res, 'Failed to get QR code', error, 500);
  }
};
