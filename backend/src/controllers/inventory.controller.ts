import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { ApiResponse } from '../utils/api-response';
import { logger } from '../utils/logger';

/**
 * GET /api/v1/inventory
 * List all inventory items for this restaurant.
 */
export const getInventory = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { lowStock } = req.query;

    const where: any = { restaurantId };

    // Filter for items below minimum threshold
    if (lowStock === 'true') {
      // We compare quantity against minThreshold using a raw filter approach
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    // Post-filter for low stock if requested
    const result = lowStock === 'true'
      ? items.filter((item) => item.quantity <= item.minThreshold)
      : items;

    return ApiResponse.success(res, 'Inventory retrieved', result);
  } catch (error) {
    logger.error('getInventory error:', error);
    return ApiResponse.error(res, 'Failed to fetch inventory', error, 500);
  }
};

/**
 * POST /api/v1/inventory
 * Create a new inventory item.
 */
export const createInventoryItem = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { name, unit, quantity, minThreshold, costPerUnit } = req.body;

    if (!name || !unit || quantity === undefined || minThreshold === undefined || costPerUnit === undefined) {
      return ApiResponse.error(res, 'name, unit, quantity, minThreshold, and costPerUnit are all required', null, 400);
    }

    const item = await prisma.inventoryItem.create({
      data: {
        restaurantId,
        name,
        unit,
        quantity: Number(quantity),
        minThreshold: Number(minThreshold),
        costPerUnit: Number(costPerUnit)
      }
    });

    return ApiResponse.success(res, 'Inventory item created', item, 201);
  } catch (error) {
    logger.error('createInventoryItem error:', error);
    return ApiResponse.error(res, 'Failed to create inventory item', error, 500);
  }
};

/**
 * PUT /api/v1/inventory/:id
 * Update inventory item details or adjust stock quantity.
 */
export const updateInventoryItem = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const { name, unit, quantity, minThreshold, costPerUnit } = req.body;

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, restaurantId }
    });

    if (!existing) {
      return ApiResponse.error(res, 'Inventory item not found', null, 404);
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(unit !== undefined && { unit }),
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(minThreshold !== undefined && { minThreshold: Number(minThreshold) }),
        ...(costPerUnit !== undefined && { costPerUnit: Number(costPerUnit) })
      }
    });

    // Auto-update menu item availability based on stock
    if (quantity !== undefined && Number(quantity) <= 0) {
      logger.info(`[Inventory] Item "${updated.name}" stock reached zero. Consider marking related menu items unavailable.`);
    }

    return ApiResponse.success(res, 'Inventory item updated', updated);
  } catch (error) {
    logger.error('updateInventoryItem error:', error);
    return ApiResponse.error(res, 'Failed to update inventory item', error, 500);
  }
};

/**
 * DELETE /api/v1/inventory/:id
 * Delete an inventory item.
 */
export const deleteInventoryItem = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, restaurantId }
    });

    if (!existing) {
      return ApiResponse.error(res, 'Inventory item not found', null, 404);
    }

    await prisma.inventoryItem.delete({ where: { id } });

    return ApiResponse.success(res, 'Inventory item deleted');
  } catch (error) {
    logger.error('deleteInventoryItem error:', error);
    return ApiResponse.error(res, 'Failed to delete inventory item', error, 500);
  }
};
