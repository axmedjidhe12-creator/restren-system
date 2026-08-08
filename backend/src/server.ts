import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { ENV } from './config/env.config';
import { logger } from './utils/logger';
import { startCronJobs } from './services/cron.service';
import { setIo } from './services/socket.service';


const server = http.createServer(app);

export const io = new SocketIOServer(server, {
  cors: {
    origin: ENV.CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

// Initialize the Socket.IO singleton for use in controllers
setIo(io);


// ========================
// SOCKET.IO EVENT HANDLERS
// ========================
io.on('connection', (socket) => {
  logger.info(`[Socket.IO] Client connected: ${socket.id}`);

  // Staff & Waiter join their restaurant+branch room
  socket.on('join_tenant_room', ({ restaurantId, branchId }: { restaurantId: string; branchId: string }) => {
    const room = `restaurant_${restaurantId}_branch_${branchId}`;
    socket.join(room);
    logger.info(`[Socket.IO] ${socket.id} joined room: ${room}`);
  });

  // Kitchen staff join their dedicated kitchen room
  socket.on('join_kitchen', ({ restaurantId, branchId }: { restaurantId: string; branchId: string }) => {
    const room = `restaurant_${restaurantId}_kitchen_${branchId}`;
    socket.join(room);
    logger.info(`[Socket.IO] ${socket.id} joined kitchen: ${room}`);
  });

  // Cashier joins their cashier notification room
  socket.on('join_cashier', ({ restaurantId, branchId }: { restaurantId: string; branchId: string }) => {
    const room = `restaurant_${restaurantId}_cashier_${branchId}`;
    socket.join(room);
    logger.info(`[Socket.IO] ${socket.id} joined cashier: ${room}`);
  });

  // Customer call waiter event
  socket.on('call_waiter', (data: { restaurantId: string; branchId: string; tableNumber: string }) => {
    const { restaurantId, branchId, tableNumber } = data;
    const room = `restaurant_${restaurantId}_branch_${branchId}`;
    io.to(room).emit('waiter_called', { tableNumber, timestamp: new Date().toISOString() });
    logger.info(`[Socket.IO] Waiter called at table ${tableNumber} in branch ${branchId}`);
  });

  // Customer request bill event
  socket.on('request_bill', (data: { restaurantId: string; branchId: string; tableNumber: string; orderId: string }) => {
    const { restaurantId, branchId, tableNumber, orderId } = data;
    const cashierRoom = `restaurant_${restaurantId}_cashier_${branchId}`;
    const branchRoom = `restaurant_${restaurantId}_branch_${branchId}`;
    io.to(cashierRoom).emit('bill_requested', { tableNumber, orderId, timestamp: new Date().toISOString() });
    io.to(branchRoom).emit('bill_requested', { tableNumber, orderId, timestamp: new Date().toISOString() });
    logger.info(`[Socket.IO] Bill requested at table ${tableNumber} for order ${orderId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// ========================
// START SERVER
// ========================
const PORT = Number(ENV.PORT);

server.listen(PORT, () => {
  logger.info(`🚀 [RESTREN SYSTEM] Enterprise Backend running on port ${PORT} in ${ENV.NODE_ENV} mode`);
  logger.info(`📡 WebSocket server ready — Socket.IO active`);
  logger.info(`🌍 Serving Ethiopian Multi-Tenant Restaurant SaaS | Africa/Addis_Ababa`);

  // Start background cron jobs
  startCronJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
