import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { ApiResponse } from '../utils/api-response';
import { getIo } from '../services/socket.service';
import { logger } from '../utils/logger';


/**
 * POST /api/v1/orders/public
 * Public endpoint — customers submit orders via QR code scan.
 * No authentication required.
 */
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { restaurantId, branchId, tableId, orderType, paymentMethod, items, customerName, customerPhone } = req.body;

    if (!restaurantId || !branchId || !items || !Array.isArray(items) || items.length === 0) {
      return ApiResponse.error(res, 'restaurantId, branchId, and items[] are required', null, 400);
    }

    // Verify restaurant is active
    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurantId, isDeleted: false, subscriptionStatus: { in: ['ACTIVE', 'TRIAL'] } }
    });

    if (!restaurant) {
      return ApiResponse.error(res, 'Restaurant is not accepting orders at this time', null, 403);
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

    let subtotal = 0;
    const orderItemsData: { menuItemId: string; quantity: number; unitPrice: any; notes: string | null }[] = [];

    // Validate all items and calculate totals
    for (const item of items) {
      if (!item.menuItemId || !item.quantity) {
        return ApiResponse.error(res, 'Each item must have menuItemId and quantity', null, 400);
      }

      const menuItem = await prisma.menuItem.findFirst({
        where: { id: item.menuItemId, restaurantId, isAvailable: true }
      });

      if (!menuItem) {
        return ApiResponse.error(res, `Menu item "${item.menuItemId}" is not available`, null, 404);
      }

      subtotal += Number(menuItem.price) * Number(item.quantity);

      orderItemsData.push({
        menuItemId: menuItem.id,
        quantity: Number(item.quantity),
        unitPrice: menuItem.price,
        notes: item.notes || null
      });
    }

    const tax = parseFloat((subtotal * 0.15).toFixed(2)); // Ethiopia 15% VAT
    const totalAmount = parseFloat((subtotal + tax).toFixed(2));

    // Update table status to OCCUPIED if tableId provided
    if (tableId) {
      await prisma.restaurantTable.updateMany({
        where: { id: tableId, restaurantId },
        data: { status: 'OCCUPIED' }
      });
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        restaurantId,
        branchId,
        tableId: tableId || null,
        orderType: (orderType as any) || 'DINE_IN',
        paymentMethod: (paymentMethod as any) || 'CASH',
        subtotal,
        tax,
        totalAmount,
        items: { create: orderItemsData }
      },
      include: {
        items: { include: { menuItem: { select: { name: true, images: true, prepTimeMins: true } } } },
        table: { select: { tableNumber: true } }
      }
    });

    // Emit real-time events
    const io = getIo(); if (io) {
      io.to(`restaurant_${restaurantId}_kitchen_${branchId}`).emit('new_kitchen_order', {
        ...order,
        customerName: customerName || 'Customer',
        customerPhone: customerPhone || null
      });

      io.to(`restaurant_${restaurantId}_branch_${branchId}`).emit('new_order', {
        ...order,
        tableNumber: order.table?.tableNumber
      });
    }

    logger.info(`[Order] New order ${orderNumber} created for restaurant ${restaurantId} branch ${branchId}`);

    return ApiResponse.success(res, 'Order placed successfully', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus
    }, 201);
  } catch (error) {
    logger.error('createOrder error:', error);
    return ApiResponse.error(res, 'Failed to place order', error, 500);
  }
};

/**
 * GET /api/v1/orders/live
 * Kitchen & Waiter fetch active orders.
 * Query: ?branchId=<id>&status=PENDING,PREPARING
 */
export const getLiveOrders = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { branchId, status } = req.query;

    const statusList = status
      ? String(status).split(',').map((s) => s.trim())
      : ['PENDING', 'PREPARING', 'READY'];

    const where: any = {
      restaurantId,
      status: { in: statusList as any }
    };

    if (branchId) where.branchId = String(branchId);

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: { menuItem: { select: { name: true, images: true, prepTimeMins: true } } }
        },
        table: { select: { tableNumber: true } },
        branch: { select: { name: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    return ApiResponse.success(res, 'Live orders retrieved', orders);
  } catch (error) {
    logger.error('getLiveOrders error:', error);
    return ApiResponse.error(res, 'Failed to fetch live orders', error, 500);
  }
};

/**
 * PATCH /api/v1/orders/:id/status
 * Kitchen or Waiter updates order status.
 */
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const { status } = req.body;

    const VALID_STATUSES = ['PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];

    if (!status || !VALID_STATUSES.includes(status)) {
      return ApiResponse.error(res, `Status must be one of: ${VALID_STATUSES.join(', ')}`, null, 400);
    }

    const order = await prisma.order.findFirst({ where: { id, restaurantId } });

    if (!order) {
      return ApiResponse.error(res, 'Order not found', null, 404);
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: status as any },
      include: {
        table: { select: { tableNumber: true } },
        items: { include: { menuItem: { select: { name: true, images: true, prepTimeMins: true } } } }
      }
    });

    // Free up table if order completed or cancelled
    if ((status === 'COMPLETED' || status === 'CANCELLED') && order.tableId) {
      await prisma.restaurantTable.updateMany({
        where: { id: order.tableId },
        data: { status: 'AVAILABLE' }
      });
    }

    // Emit status update to all rooms in this branch
    const io = getIo(); if (io) {
      io.to(`restaurant_${restaurantId}_branch_${order.branchId}`).emit('order_status_updated', updated);
      io.to(`restaurant_${restaurantId}_kitchen_${order.branchId}`).emit('order_status_updated', updated);
    }

    return ApiResponse.success(res, `Order status updated to ${status}`, updated);
  } catch (error) {
    logger.error('updateOrderStatus error:', error);
    return ApiResponse.error(res, 'Failed to update order status', error, 500);
  }
};

/**
 * GET /api/v1/orders
 * Paginated list of all orders for owner/manager reporting.
 */
export const getOrders = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { page = '1', limit = '30', branchId, status, from, to } = req.query;

    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { restaurantId };
    if (branchId) where.branchId = String(branchId);
    if (status) where.status = String(status) as any;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          table: { select: { tableNumber: true } },
          branch: { select: { name: true } },
          items: { include: { menuItem: { select: { name: true } } } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);

    // Revenue summary
    const revenueAgg = await prisma.order.aggregate({
      where: { ...where, paymentStatus: 'PAID' },
      _sum: { totalAmount: true }
    });

    return ApiResponse.success(res, 'Orders retrieved', {
      orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      },
      summary: {
        totalRevenue: revenueAgg._sum.totalAmount || 0
      }
    });
  } catch (error) {
    logger.error('getOrders error:', error);
    return ApiResponse.error(res, 'Failed to fetch orders', error, 500);
  }
};
