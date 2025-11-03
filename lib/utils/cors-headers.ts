/**
 * CORS Headers Utility
 * Provides CORS headers for API routes
 */

export function getCorsHeaders(origin: string | null) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://leadgaze.vercel.app',
    process.env.NEXT_PUBLIC_API_URL || '',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  ].filter(Boolean);
  
  // Check if origin is allowed
  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.startsWith(allowed)
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

export function addCorsHeaders(response: Response, origin: string | null): Response {
  const headers = getCorsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

