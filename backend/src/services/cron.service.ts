import cron from 'node-cron';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * CRON: Run every day at 00:00 (Addis Ababa midnight, UTC+3)
 * Checks and expires any restaurant subscriptions past their due date.
 */
const subscriptionExpiryJob = cron.schedule('0 21 * * *', async () => {
  logger.info('[CronJob] Running subscription expiry check...');

  try {
    const now = new Date();

    const expiredRestaurants = await prisma.restaurant.updateMany({
      where: {
        subscriptionStatus: 'ACTIVE',
        subscriptionExpiresAt: { lte: now }
      },
      data: { subscriptionStatus: 'EXPIRED' }
    });

    if (expiredRestaurants.count > 0) {
      logger.info(`[CronJob] Marked ${expiredRestaurants.count} restaurant(s) as EXPIRED`);
    } else {
      logger.info('[CronJob] No expired subscriptions found.');
    }
  } catch (error) {
    logger.error('[CronJob] Subscription expiry check failed:', error);
  }
}, { scheduled: false });

/**
 * CRON: Run every day at 01:00
 * Marks menu items as unavailable when stock reaches zero.
 */
const inventoryAutoMarkJob = cron.schedule('0 22 * * *', async () => {
  logger.info('[CronJob] Running inventory auto-mark check...');

  try {
    const updated = await prisma.menuItem.updateMany({
      where: {
        stockQuantity: { lte: 0 },
        isAvailable: true
      },
      data: { isAvailable: false }
    });

    if (updated.count > 0) {
      logger.info(`[CronJob] Marked ${updated.count} menu item(s) as unavailable due to zero stock`);
    }
  } catch (error) {
    logger.error('[CronJob] Inventory auto-mark check failed:', error);
  }
}, { scheduled: false });

/**
 * Starts all cron jobs.
 * Called once from server.ts.
 */
export const startCronJobs = () => {
  subscriptionExpiryJob.start();
  inventoryAutoMarkJob.start();
  logger.info('[CronService] All cron jobs initialized.');
};
