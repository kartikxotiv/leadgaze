import { emailsSyncController } from './controller';

/**
 * Cron job endpoint for syncing external core email accounts (Gmail, Outlook, etc.)
 * This endpoint can be triggered every 5-10 minutes by a cron service
 */
export const GET = emailsSyncController;
