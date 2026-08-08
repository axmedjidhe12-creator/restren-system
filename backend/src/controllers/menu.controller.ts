import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { ApiResponse } from '../utils/api-response';
import { logger } from '../utils/logger';
import { uploadToCloudinary } from '../services/cloudinary.service';

// ========================
// PUBLIC MENU (No Auth)
// ========================

/**
 * GET /api/v1/menu/public/:slug
 * Returns full restaurant info + categories + menu items.
 * No authentication required — used by QR code scan customers.
 */
export const getPublicMenu = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const restaurant = await prisma.restaurant.findFirst({
      where: {
        slug,
        isDeleted: false,
        subscriptionStatus: { in: ['ACTIVE', 'TRIAL'] }
      },
      include: {
        branches: { where: { isActive: true }, take: 1 },
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            menuItems: {
              where: { isAvailable: true },
              orderBy: [{ isPopular: 'desc' }, { createdAt: 'asc' }]
            }
          }
        }
      }
    });

    if (!restaurant) {
      return ApiResponse.error(res, 'Restaurant not found or not accepting orders', null, 404);
    }

    return ApiResponse.success(res, 'Public menu retrieved', {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        logoUrl: restaurant.logoUrl,
        description: restaurant.description,
        currency: restaurant.currency,
        branchId: restaurant.branches[0]?.id || null
      },
      categories: restaurant.categories
    });
  } catch (error) {
    logger.error('getPublicMenu error:', error);
    return ApiResponse.error(res, 'Failed to fetch public menu', error, 500);
  }
};

// ========================
// CATEGORY MANAGEMENT
// ========================

/**
 * GET /api/v1/menu/categories
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;

    const categories = await prisma.category.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { menuItems: true } }
      }
    });

    return ApiResponse.success(res, 'Categories retrieved', categories);
  } catch (error) {
    logger.error('getCategories error:', error);
    return ApiResponse.error(res, 'Failed to fetch categories', error, 500);
  }
};

/**
 * POST /api/v1/menu/categories
 * name must be localized JSON: { en, am, so, om }
 */
export const createCategory = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { name, sortOrder } = req.body;

    if (!name) {
      return ApiResponse.error(res, 'name (localized JSON) is required', null, 400);
    }

    const parsedName = typeof name === 'string' ? JSON.parse(name) : name;

    let imageUrl: string | undefined;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'menu-items', `cat_${Date.now()}`);
      imageUrl = result.secure_url;
    }

    const category = await prisma.category.create({
      data: {
        restaurantId,
        name: parsedName,
        imageUrl,
        sortOrder: sortOrder ? Number(sortOrder) : 0
      }
    });

    return ApiResponse.success(res, 'Category created', category, 201);
  } catch (error) {
    logger.error('createCategory error:', error);
    return ApiResponse.error(res, 'Failed to create category', error, 500);
  }
};

/**
 * PUT /api/v1/menu/categories/:id
 */
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const { name, sortOrder } = req.body;

    const existing = await prisma.category.findFirst({ where: { id, restaurantId } });
    if (!existing) {
      return ApiResponse.error(res, 'Category not found', null, 404);
    }

    let imageUrl = existing.imageUrl;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'menu-items', `cat_${id}`);
      imageUrl = result.secure_url;
    }

    const parsedName = name
      ? typeof name === 'string'
        ? JSON.parse(name)
        : name
      : existing.name;

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: parsedName,
        imageUrl,
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) })
      }
    });

    return ApiResponse.success(res, 'Category updated', updated);
  } catch (error) {
    logger.error('updateCategory error:', error);
    return ApiResponse.error(res, 'Failed to update category', error, 500);
  }
};

/**
 * DELETE /api/v1/menu/categories/:id
 */
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;

    const existing = await prisma.category.findFirst({ where: { id, restaurantId } });
    if (!existing) {
      return ApiResponse.error(res, 'Category not found', null, 404);
    }

    await prisma.category.delete({ where: { id } });

    return ApiResponse.success(res, 'Category deleted successfully');
  } catch (error) {
    logger.error('deleteCategory error:', error);
    return ApiResponse.error(res, 'Failed to delete category', error, 500);
  }
};

// ========================
// MENU ITEM MANAGEMENT
// ========================

/**
 * GET /api/v1/menu/items
 * Optional query: ?categoryId=<id>&isAvailable=true
 */
export const getMenuItems = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { categoryId, isAvailable } = req.query;

    const where: any = { restaurantId };
    if (categoryId) where.categoryId = String(categoryId);
    if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';

    const items = await prisma.menuItem.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return ApiResponse.success(res, 'Menu items retrieved', items);
  } catch (error) {
    logger.error('getMenuItems error:', error);
    return ApiResponse.error(res, 'Failed to fetch menu items', error, 500);
  }
};

/**
 * POST /api/v1/menu/items
 * Creates menu item with optional multi-image upload.
 */
export const createMenuItem = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const {
      categoryId,
      name,
      description,
      price,
      prepTimeMins,
      isPopular,
      stockQuantity
    } = req.body;

    if (!categoryId || !name || price === undefined) {
      return ApiResponse.error(res, 'categoryId, name, and price are required', null, 400);
    }

    const category = await prisma.category.findFirst({ where: { id: categoryId, restaurantId } });
    if (!category) {
      return ApiResponse.error(res, 'Category not found', null, 404);
    }

    const parsedName = typeof name === 'string' ? JSON.parse(name) : name;
    const parsedDesc = description
      ? typeof description === 'string'
        ? JSON.parse(description)
        : description
      : { en: '' };

    // Upload images if provided (supports multiple)
    const imageUrls: string[] = [];
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      for (const file of files) {
        const result = await uploadToCloudinary(file.buffer, 'menu-items', `item_${Date.now()}_${Math.random()}`);
        imageUrls.push(result.secure_url);
      }
    }

    const item = await prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId,
        name: parsedName,
        description: parsedDesc,
        price: Number(price),
        prepTimeMins: prepTimeMins ? Number(prepTimeMins) : 15,
        images: imageUrls,
        isPopular: Boolean(isPopular),
        stockQuantity: stockQuantity ? Number(stockQuantity) : 100
      }
    });

    return ApiResponse.success(res, 'Menu item created', item, 201);
  } catch (error) {
    logger.error('createMenuItem error:', error);
    return ApiResponse.error(res, 'Failed to create menu item', error, 500);
  }
};

/**
 * PUT /api/v1/menu/items/:id
 */
export const updateMenuItem = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;
    const { name, description, price, prepTimeMins, isAvailable, isPopular, stockQuantity, categoryId } = req.body;

    const existing = await prisma.menuItem.findFirst({ where: { id, restaurantId } });
    if (!existing) {
      return ApiResponse.error(res, 'Menu item not found', null, 404);
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(name && { name: typeof name === 'string' ? JSON.parse(name) : name }),
        ...(description && { description: typeof description === 'string' ? JSON.parse(description) : description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(prepTimeMins !== undefined && { prepTimeMins: Number(prepTimeMins) }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(isPopular !== undefined && { isPopular: Boolean(isPopular) }),
        ...(stockQuantity !== undefined && { stockQuantity: Number(stockQuantity) }),
        ...(categoryId && { categoryId })
      }
    });

    return ApiResponse.success(res, 'Menu item updated', updated);
  } catch (error) {
    logger.error('updateMenuItem error:', error);
    return ApiResponse.error(res, 'Failed to update menu item', error, 500);
  }
};

/**
 * DELETE /api/v1/menu/items/:id
 */
export const deleteMenuItem = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.restaurantId!;
    const { id } = req.params;

    const existing = await prisma.menuItem.findFirst({ where: { id, restaurantId } });
    if (!existing) {
      return ApiResponse.error(res, 'Menu item not found', null, 404);
    }

    await prisma.menuItem.delete({ where: { id } });

    return ApiResponse.success(res, 'Menu item deleted');
  } catch (error) {
    logger.error('deleteMenuItem error:', error);
    return ApiResponse.error(res, 'Failed to delete menu item', error, 500);
  }
};
