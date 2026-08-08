import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadLogo,
  uploadCover,
  getBranches,
  createBranch,
  updateBranch,
  getStaff,
  createStaff,
  toggleStaffStatus
} from '../controllers/restaurant.controller';
import { authenticateJwt, authorizeRoles } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenant.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// All restaurant routes require authentication and tenant context
router.use(authenticateJwt);
router.use(enforceTenantIsolation);

// Profile
router.get('/profile', getProfile);
router.put('/profile', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), updateProfile);
router.post('/upload-logo', authorizeRoles('RESTAURANT_OWNER'), upload.single('logo'), uploadLogo);
router.post('/upload-cover', authorizeRoles('RESTAURANT_OWNER'), upload.single('cover'), uploadCover);

// Branch Management
router.get('/branches', getBranches);
router.post('/branches', authorizeRoles('RESTAURANT_OWNER'), createBranch);
router.put('/branches/:id', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), updateBranch);

// Staff Management
router.get('/staff', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), getStaff);
router.post('/staff', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), createStaff);
router.patch('/staff/:id/toggle-status', authorizeRoles('RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), toggleStaffStatus);

export default router;
