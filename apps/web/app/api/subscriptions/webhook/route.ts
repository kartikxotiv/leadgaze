/**
 * Razorpay Webhook Route
 *
 * This endpoint receives invoice and payment-link events from Razorpay.
 * It does not require session authentication; HMAC verification is mandatory.
 *
 * The middleware matcher already excludes /api/* routes,
 * so no middleware auth is applied here.
 */
export { POST } from './controller';
