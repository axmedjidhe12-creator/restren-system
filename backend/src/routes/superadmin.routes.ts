import { Router } from 'express';
import {
  getAllTenants,
  updateTenantStatus,
  getPlatformAnalytics,
  getPlans,
  createPlan,
  getAuditLogs
} from '../controllers/superadmin.controller';
import { authenticateJwt, authorizeRoles } from '../middlewares/auth.middleware';

const router = Router();

// All Super Admin routes require JWT + SUPER_ADMIN role
router.use(authenticateJwt);
router.use(authorizeRoles('SUPER_ADMIN'));

// Tenant Management
router.get('/tenants', getAllTenants);
router.patch('/tenants/:id/status', updateTenantStatus);

// Analytics
router.get('/analytics', getPlatformAnalytics);

// Plan Management
router.get('/plans', getPlans);
router.post('/plans', createPlan);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

export default router;
