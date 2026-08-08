import { Router } from 'express';
import {
  getTables,
  createTable,
  updateTableStatus,
  assignWaiter,
  getTableQr
} from '../controllers/table.controller';
import { authenticateJwt, authorizeRoles } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();

router.use(authenticateJwt);
router.use(enforceTenantIsolation);

router.get('/', getTables);
router.post('/', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), createTable);
router.patch('/:id/status', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER', 'WAITER', 'CASHIER'), updateTableStatus);
router.patch('/:id/assign-waiter', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), assignWaiter);
router.get('/:id/qr', getTableQr);

export default router;
