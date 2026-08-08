import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { ApiResponse } from '../utils/api-response';
import { logger } from '../utils/logger';

/**
 * GET /api/v1/superadmin/tenants
 * Paginated list of all registered SaaS restaurant tenants.
 */
export const getAllTenants = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, search } = req.query;

    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isDeleted: false };
    if (status) where.subscriptionStatus = String(status);
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
        { slug: { contains: String(search) } }
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          plan: { select: { name: true, priceEtb: true } },
          _count: {
            select: { branches: true, users: true, orders: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.restaurant.count({ where })
    ]);

    return ApiResponse.success(res, 'Tenants retrieved', {
      tenants,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('getAllTenants error:', error);
    return ApiResponse.error(res, 'Failed to fetch tenants', error, 500);
  }
};

/**
 * PATCH /api/v1/superadmin/tenants/:id/status
 * Activate or Suspend a restaurant tenant.
 */
export const updateTenantStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID_STATUSES = ['ACTIVE', 'SUSPENDED', 'TRIAL', 'EXPIRED'];
    if (!status || !VALID_STATUSES.includes(status)) {
      return ApiResponse.error(res, `Status must be one of: ${VALID_STATUSES.join(', ')}`, null, 400);
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { id, isDeleted: false }
    });

    if (!restaurant) {
      return ApiResponse.error(res, 'Restaurant tenant not found', null, 404);
    }

    const updated = await prisma.restaurant.update({
      where: { id },
      data: { subscriptionStatus: status as any }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        restaurantId: id,
        userId: req.user!.id,
        action: `TENANT_STATUS_CHANGED_TO_${status}`,
        details: { previousStatus: restaurant.subscriptionStatus, newStatus: status }
      }
    });

    return ApiResponse.success(res, `Restaurant status updated to ${status}`, {
      id: updated.id,
      name: updated.name,
      subscriptionStatus: updated.subscriptionStatus
    });
  } catch (error) {
    logger.error('updateTenantStatus error:', error);
    return ApiResponse.error(res, 'Failed to update tenant status', error, 500);
  }
};

/**
 * GET /api/v1/superadmin/analytics
 * Platform-wide analytics: total tenants, revenue, subscriptions by plan.
 */
export const getPlatformAnalytics = async (req: Request, res: Response) => {
  try {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalOrders,
      planBreakdown
    ] = await Promise.all([
      prisma.restaurant.count({ where: { isDeleted: false } }),
      prisma.restaurant.count({ where: { isDeleted: false, subscriptionStatus: 'ACTIVE' } }),
      prisma.restaurant.count({ where: { isDeleted: false, subscriptionStatus: 'SUSPENDED' } }),
      prisma.order.count(),
      prisma.restaurant.groupBy({
        by: ['planId'],
        _count: { id: true }
      })
    ]);

    // Fetch plan names
    const plans = await prisma.plan.findMany({ select: { id: true, name: true, priceEtb: true } });
    const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));

    const planStats = planBreakdown.map((item) => ({
      plan: planMap[item.planId]?.name || 'Unknown',
      priceEtb: planMap[item.planId]?.priceEtb || 0,
      restaurantCount: item._count.id
    }));

    return ApiResponse.success(res, 'Platform analytics retrieved', {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
        trial: totalTenants - activeTenants - suspendedTenants
      },
      orders: { total: totalOrders },
      planDistribution: planStats
    });
  } catch (error) {
    logger.error('getPlatformAnalytics error:', error);
    return ApiResponse.error(res, 'Failed to fetch platform analytics', error, 500);
  }
};

/**
 * GET /api/v1/superadmin/plans
 * List all subscription plans.
 */
export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      include: { _count: { select: { restaurants: true } } },
      orderBy: { priceEtb: 'asc' }
    });
    return ApiResponse.success(res, 'Plans retrieved', plans);
  } catch (error) {
    return ApiResponse.error(res, 'Failed to fetch plans', error, 500);
  }
};

/**
 * POST /api/v1/superadmin/plans
 * Create a new subscription plan.
 */
export const createPlan = async (req: Request, res: Response) => {
  try {
    const { name, priceEtb, billingCycle, maxBranches, maxTables, maxStaff, features } = req.body;

    if (!name || priceEtb === undefined) {
      return ApiResponse.error(res, 'name and priceEtb are required', null, 400);
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        priceEtb: Number(priceEtb),
        billingCycle: billingCycle || 'monthly',
        maxBranches: maxBranches ? Number(maxBranches) : 1,
        maxTables: maxTables ? Number(maxTables) : 10,
        maxStaff: maxStaff ? Number(maxStaff) : 5,
        features: features || []
      }
    });

    return ApiResponse.success(res, 'Plan created successfully', plan, 201);
  } catch (error) {
    logger.error('createPlan error:', error);
    return ApiResponse.error(res, 'Failed to create plan', error, 500);
  }
};

/**
 * GET /api/v1/superadmin/audit-logs
 * View all platform-wide audit logs with pagination.
 */
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', restaurantId } = req.query;
    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (restaurantId) where.restaurantId = String(restaurantId);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          user: { select: { fullName: true, email: true, role: true } },
          restaurant: { select: { name: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ]);

    return ApiResponse.success(res, 'Audit logs retrieved', {
      logs,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    logger.error('getAuditLogs error:', error);
    return ApiResponse.error(res, 'Failed to fetch audit logs', error, 500);
  }
};
