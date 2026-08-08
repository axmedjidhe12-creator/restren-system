import { Router } from 'express';
import { registerOwner, login, getMe } from '../controllers/auth.controller';
import { waiterPinLogin } from '../controllers/staff.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', registerOwner);
router.post('/login', login);
router.post('/waiter-login', waiterPinLogin);  // PIN-based waiter login
router.get('/me', authenticateJwt, getMe);

export default router;
