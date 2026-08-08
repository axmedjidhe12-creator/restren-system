import { Router } from 'express';
import { createOrder, getLiveOrders, updateOrderStatus, getOrders } from '../controllers/order.controller';
import { authenticateJwt, authorizeRoles } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();

// ========================
// PUBLIC (No Auth Required)
// ========================
// Customer places order via QR code scan
router.post('/public', createOrder);

// ========================
// AUTHENTICATED STAFF ROUTES
// ========================
router.use(authenticateJwt);
router.use(enforceTenantIsolation);

// Kitchen / Waiter live feed
router.get('/live', authorizeRoles('KITCHEN_STAFF', 'WAITER', 'RESTAURANT_OWNER', 'RESTAURANT_MANAGER', 'CASHIER'), getLiveOrders);

// Update order status (Kitchen marks PREPARING/READY, Waiter marks SERVED)
router.patch('/:id/status', authorizeRoles('KITCHEN_STAFF', 'WAITER', 'RESTAURANT_OWNER', 'RESTAURANT_MANAGER', 'CASHIER'), updateOrderStatus);

// Owner/Manager paginated order history & reports
router.get('/', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER', 'CASHIER'), getOrders);

export default router;
