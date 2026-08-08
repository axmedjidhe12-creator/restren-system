import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { ENV } from './config/env.config';
import { errorHandler } from './middlewares/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import restaurantRoutes from './routes/restaurant.routes';
import menuRoutes from './routes/menu.routes';
import tableRoutes from './routes/table.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import superAdminRoutes from './routes/superadmin.routes';
import inventoryRoutes from './routes/inventory.routes';
import staffRoutes from './routes/staff.routes';

const app: Application = express();

// ========================
// GLOBAL MIDDLEWARE
// ========================
app.use(helmet());
app.use(compression());
// Parse CORS origins (comma-separated for multiple origins)
const corsOrigins = ENV.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ========================
// RATE LIMITER
// ========================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
});

app.use('/api', apiLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// ========================
// HEALTH CHECK
// ========================
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'RESTREN-SYSTEM-API',
    timestamp: new Date().toISOString(),
    timezone: 'Africa/Addis_Ababa'
  });
});

// ========================
// API v1 ROUTES
// ========================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/restaurant', restaurantRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/superadmin', superAdminRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/staff', staffRoutes);

// ========================
// 404 HANDLER
// ========================
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// ========================
// GLOBAL ERROR HANDLER
// ========================
app.use(errorHandler);

export default app;

// NOTE: Do NOT call server.listen() here.
// HTTP server startup is handled exclusively in server.ts
// so that tests importing app.ts do not conflict with port binding.
