/**
 * Stripe Webhook Route
 *
 * This endpoint receives events from Stripe.
 * It does NOT require authentication — Stripe calls this directly.
 * Security is handled via signature verification in the controller.
 *
 * The middleware matcher already excludes /api/* routes,
 * so no middleware auth is applied here.
 */
export { POST } from './controller';
