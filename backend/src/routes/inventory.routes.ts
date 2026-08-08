import { Router } from 'express';
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../controllers/inventory.controller';
import { authenticateJwt, authorizeRoles } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();

router.use(authenticateJwt);
router.use(enforceTenantIsolation);

router.get('/', getInventory);
router.post('/', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), createInventoryItem);
router.put('/:id', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), updateInventoryItem);
router.delete('/:id', authorizeRoles('RESTAURANT_OWNER'), deleteInventoryItem);

export default router;
