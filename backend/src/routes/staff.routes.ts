import { Router } from 'express';
import { authenticateJwt, authorizeRoles } from '../middlewares/auth.middleware';
import {
  listWaiters,
  createWaiter,
  updateWaiter,
  deleteWaiter
} from '../controllers/staff.controller';

const router = Router();

// All staff routes require authentication + management role
router.use(authenticateJwt);
router.use(authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER', 'SUPER_ADMIN'));

/**
 * GET  /api/v1/staff/waiters     — List all waiters + their assigned tables
 * POST /api/v1/staff/waiters     — Create new waiter with auto-generated PIN
 */
router.get('/waiters', listWaiters);
router.post('/waiters', createWaiter);

/**
 * PATCH  /api/v1/staff/waiters/:id  — Update waiter info / reassign tables
 * DELETE /api/v1/staff/waiters/:id  — Soft-delete / deactivate waiter
 */
router.patch('/waiters/:id', updateWaiter);
router.delete('/waiters/:id', deleteWaiter);

export default router;
