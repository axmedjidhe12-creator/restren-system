import { Router } from 'express';
import {
  getPublicMenu,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} from '../controllers/menu.controller';
import { authenticateJwt, authorizeRoles } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenant.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// ========================
// PUBLIC ROUTES (No Auth)
// ========================
router.get('/public/:slug', getPublicMenu);

// ========================
// AUTHENTICATED ROUTES
// ========================
router.use(authenticateJwt);
router.use(enforceTenantIsolation);


// Categories
router.get('/categories', getCategories);
router.post('/categories', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), upload.single('image'), createCategory);
router.put('/categories/:id', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), upload.single('image'), updateCategory);
router.delete('/categories/:id', authorizeRoles('RESTAURANT_OWNER'), deleteCategory);

// Menu Items
router.get('/items', getMenuItems);
router.post('/items', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), upload.array('images', 5), createMenuItem);
router.put('/items/:id', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), updateMenuItem);
router.delete('/items/:id', authorizeRoles('RESTAURANT_OWNER'), deleteMenuItem);

export default router;
