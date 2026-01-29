import { notificationReminderController } from './controller';

/**
 * Cron job endpoint for checking and sending reminder/meeting notifications
 * This endpoint should be triggered every minute by a cron service (e.g., Vercel Cron)
 *
 * Security: Vercel Cron automatically adds a special header that we can verify
 * For local testing or other cron services, use CRON_SECRET environment variable
 */
export const GET = notificationReminderController;
