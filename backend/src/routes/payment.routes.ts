import { Router } from 'express';
import { uploadPaymentProof, verifyPayment, getPendingPayments } from '../controllers/payment.controller';
import { authenticateJwt, authorizeRoles } from '../middlewares/auth.middleware';
import { enforceTenantIsolation } from '../middlewares/tenant.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// Public: Customer submits payment proof (no auth required - QR flow)
router.post('/upload-proof', upload.single('proof'), uploadPaymentProof);

// Cashier authenticated routes
router.use(authenticateJwt);
router.use(enforceTenantIsolation);

router.get('/pending', authorizeRoles('CASHIER', 'RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), getPendingPayments);
router.patch('/:orderId/verify', authorizeRoles('CASHIER', 'RESTAURANT_OWNER', 'RESTAURANT_MANAGER'), verifyPayment);

export default router;
