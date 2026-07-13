import { syncExchangeRatesController } from './controller';

/**
 * Cron job endpoint for daily exchange rate synchronization.
 * This endpoint should be triggered once daily by a cron service (e.g., Vercel Cron Jobs).
 *
 * Schedule: Daily at 00:05 UTC
 * CRON: 5 0 * * *
 *
 * Security: Configure CRON_SECRET environment variable for local/production use.
 * Vercel Cron automatically adds a special header for verification.
 */
export const GET = syncExchangeRatesController;
