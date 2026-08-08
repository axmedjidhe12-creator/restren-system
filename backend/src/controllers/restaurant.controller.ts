import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { ApiResponse } from '../utils/api-response';
import { uploadToCloudinary } from '../services/cloudinary.service';
import { logger } from '../utils/logger';

/**
 * GET /api/v1/restaurant/profile
 * Returns the authenticated restaurant owner's restaurant profile.
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId, isDeleted: false },
      include: {
        plan: true,
        branches: { where: { isActive: true } },
        _count: {
          select: {
            users: true,
            menuItems: true,
            orders: true
          }
        }
      }
    });

    if (!restaurant) {
      return ApiResponse.error(res, 'Restaurant not found', null, 404);
    }

    return ApiResponse.success(res, 'Restaurant profile retrieved', restaurant);
  } catch (error) {
    logger.error('getProfile error:', error);
    return ApiResponse.error(res, 'Failed to fetch restaurant profile', error, 500);
  }
};

/**
 * PUT /api/v1/restaurant/profile
 * Updates name, description, phone, email fields.
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { name, description, phone, email } = req.body;

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(phone && { phone }),
        ...(email && { email }),
        updatedBy: req.user!.id
      }
    });

    return ApiResponse.success(res, 'Restaurant profile updated', updated);
  } catch (error) {
    logger.error('updateProfile error:', error);
    return ApiResponse.error(res, 'Failed to update restaurant profile', error, 500);
  }
};

/**
 * POST /api/v1/restaurant/upload-logo
 * Uploads logo image to Cloudinary and saves URL to restaurant record.
 */
export const uploadLogo = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;

    if (!req.file) {
      return ApiResponse.error(res, 'No logo file uploaded', null, 400);
    }

    const result = await uploadToCloudinary(req.file.buffer, 'logos', `logo_${restaurantId}`);

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { logoUrl: result.secure_url, updatedBy: req.user!.id }
    });

    return ApiResponse.success(res, 'Logo uploaded successfully', { logoUrl: result.secure_url });
  } catch (error) {
    logger.error('uploadLogo error:', error);
    return ApiResponse.error(res, 'Logo upload failed', error, 500);
  }
};

/**
 * POST /api/v1/restaurant/upload-cover
 * Uploads cover image to Cloudinary.
 */
export const uploadCover = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;

    if (!req.file) {
      return ApiResponse.error(res, 'No cover image uploaded', null, 400);
    }

    const result = await uploadToCloudinary(req.file.buffer, 'covers', `cover_${restaurantId}`);

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { coverImageUrl: result.secure_url, updatedBy: req.user!.id }
    });

    return ApiResponse.success(res, 'Cover image uploaded successfully', { coverImageUrl: result.secure_url });
  } catch (error) {
    logger.error('uploadCover error:', error);
    return ApiResponse.error(res, 'Cover image upload failed', error, 500);
  }
};

// ========================
// BRANCH MANAGEMENT
// ========================

/**
 * GET /api/v1/restaurant/branches
 * List all active branches for this tenant.
 */
export const getBranches = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;

    const branches = await prisma.branch.findMany({
      where: { restaurantId },
      include: {
        _count: {
          select: { tables: true, users: true, orders: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return ApiResponse.success(res, 'Branches retrieved', branches);
  } catch (error) {
    logger.error('getBranches error:', error);
    return ApiResponse.error(res, 'Failed to fetch branches', error, 500);
  }
};

/**
 * POST /api/v1/restaurant/branches
 * Create a new branch. Enforces plan limit on max branches.
 */
export const createBranch = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { name, address, city, phone } = req.body;

    if (!name || !address || !city || !phone) {
      return ApiResponse.error(res, 'name, address, city, and phone are required', null, 400);
    }

    // Enforce plan branch limit
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { plan: true, _count: { select: { branches: true } } }
    });

    if (!restaurant) {
      return ApiResponse.error(res, 'Restaurant not found', null, 404);
    }

    if (restaurant._count.branches >= restaurant.plan.maxBranches) {
      return ApiResponse.error(
        res,
        `Your current plan only allows up to ${restaurant.plan.maxBranches} branch(es). Please upgrade.`,
        null,
        403
      );
    }

    const branch = await prisma.branch.create({
      data: { restaurantId, name, address, city, phone }
    });

    return ApiResponse.success(res, 'Branch created successfully', branch, 201);
  } catch (error) {
    logger.error('createBranch error:', error);
    return ApiResponse.error(res, 'Failed to create branch', error, 500);
  }
};

/**
 * PUT /api/v1/restaurant/branches/:id
 * Update branch details.
 */
export const updateBranch = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const { name, address, city, phone, isActive } = req.body;

    const existing = await prisma.branch.findFirst({
      where: { id, restaurantId }
    });

    if (!existing) {
      return ApiResponse.error(res, 'Branch not found', null, 404);
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(phone !== undefined && { phone }),
        ...(isActive !== undefined && { isActive })
      }
    });

    return ApiResponse.success(res, 'Branch updated successfully', updated);
  } catch (error) {
    logger.error('updateBranch error:', error);
    return ApiResponse.error(res, 'Failed to update branch', error, 500);
  }
};

// ========================
// STAFF MANAGEMENT
// ========================

/**
 * GET /api/v1/restaurant/staff
 * List all staff for this restaurant (excluding customers).
 */
export const getStaff = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { branchId, role } = req.query;

    const staff = await prisma.user.findMany({
      where: {
        restaurantId,
        isDeleted: false,
        role: role
          ? { equals: role as any }
          : { not: 'CUSTOMER' },
        ...(branchId && { branchId: String(branchId) })
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        branchId: true,
        branch: { select: { name: true } },
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return ApiResponse.success(res, 'Staff list retrieved', staff);
  } catch (error) {
    logger.error('getStaff error:', error);
    return ApiResponse.error(res, 'Failed to fetch staff list', error, 500);
  }
};

/**
 * POST /api/v1/restaurant/staff
 * Creates a new staff account under this restaurant tenant.
 */
export const createStaff = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { fullName, email, phone, password, role, branchId } = req.body;

    const STAFF_ROLES = ['RESTAURANT_MANAGER', 'WAITER', 'KITCHEN_STAFF', 'CASHIER', 'DELIVERY_DRIVER'];

    if (!fullName || !email || !phone || !password || !role) {
      return ApiResponse.error(res, 'fullName, email, phone, password, and role are all required', null, 400);
    }

    if (!STAFF_ROLES.includes(role)) {
      return ApiResponse.error(res, `Role must be one of: ${STAFF_ROLES.join(', ')}`, null, 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return ApiResponse.error(res, 'A user with this email already exists', null, 409);
    }

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 12);

    const staff = await prisma.user.create({
      data: {
        restaurantId,
        branchId: branchId || null,
        fullName,
        email,
        phone,
        passwordHash,
        role
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    return ApiResponse.success(res, 'Staff account created successfully', staff, 201);
  } catch (error) {
    logger.error('createStaff error:', error);
    return ApiResponse.error(res, 'Failed to create staff account', error, 500);
  }
};

/**
 * PATCH /api/v1/restaurant/staff/:id/toggle-status
 * Activate or deactivate a staff account.
 */
export const toggleStaffStatus = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;

    const staff = await prisma.user.findFirst({
      where: { id, restaurantId, isDeleted: false }
    });

    if (!staff) {
      return ApiResponse.error(res, 'Staff member not found', null, 404);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !staff.isActive }
    });

    return ApiResponse.success(res, `Staff account ${updated.isActive ? 'activated' : 'deactivated'}`, {
      id: updated.id,
      isActive: updated.isActive
    });
  } catch (error) {
    logger.error('toggleStaffStatus error:', error);
    return ApiResponse.error(res, 'Failed to toggle staff status', error, 500);
  }
};
