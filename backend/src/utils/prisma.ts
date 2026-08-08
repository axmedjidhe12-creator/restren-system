import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});

prisma.$connect()
  .then(() => {
    logger.info('Database connected successfully via Prisma ORM.');
  })
  .catch((err) => {
    logger.error('Failed to connect to MySQL database:', err);
  });
