import type { NextRequest } from 'next/server';
import { NextResponse, URLPattern } from 'next/server';

import { CsrfError, createCsrfProtect } from '@edge-csrf/nextjs';

import { checkRequiresMultiFactorAuthentication } from '@kit/supabase/check-requires-mfa';
import { createMiddlewareClient } from '@kit/supabase/middleware-client';

import appConfig from '~/config/app.config';
import pathsConfig from '~/config/paths.config';

const CSRF_SECRET_COOKIE = 'csrfSecret';
const NEXT_ACTION_HEADER = 'next-action';
const TRUSTED_DEVICE_COOKIE = 'lg_trusted_device';

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|locales|assets|api/impersonate|api).*)'],
};

const getUser = (request: NextRequest, response: NextResponse) => {
  const supabase = createMiddlewareClient(request, response);

  return supabase.auth.getClaims();
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // set a unique request ID for each request
  // this helps us log and trace requests
  setRequestId(request);

  // apply CSRF protection for mutating requests
  const csrfResponse = await withCsrfMiddleware(request, response);

  // handle patterns for specific routes
  const handlePattern = matchUrlPattern(request.url);

  // if a pattern handler exists, call it
  if (handlePattern) {
    const patternHandlerResponse = await handlePattern(request, csrfResponse);

    // if a pattern handler returns a response, return it
    if (patternHandlerResponse) {
      return patternHandlerResponse;
    }
  }

  // append the action path to the request headers
  // which is useful for knowing the action path in server actions
  if (isServerAction(request)) {
    csrfResponse.headers.set('x-action-path', request.nextUrl.pathname);
  }

  // if no pattern handler returned a response,
  // return the session response
  return csrfResponse;
}

async function withCsrfMiddleware(
  request: NextRequest,
  response = new NextResponse(),
) {
  // set up CSRF protection
  const csrfProtect = createCsrfProtect({
    cookie: {
      secure: appConfig.production,
      name: CSRF_SECRET_COOKIE,
    },
    // ignore CSRF errors for server actions since protection is built-in
    ignoreMethods: isServerAction(request)
      ? ['POST']
      : // always ignore GET, HEAD, and OPTIONS requests
      ['GET', 'HEAD', 'OPTIONS'],
  });

  try {
    await csrfProtect(request, response);

    return response;
  } catch (error) {
    // if there is a CSRF error, return a 403 response
    if (error instanceof CsrfError) {
      return NextResponse.json('Invalid CSRF token', {
        status: 401,
      });
    }

    throw error;
  }
}

function isServerAction(request: NextRequest) {
  const headers = new Headers(request.headers);

  return headers.has(NEXT_ACTION_HEADER);
}

/**
 * Check if the current request has a valid trusted device cookie.
 * A trusted device allows the user to bypass MFA for 30 days.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
async function hasValidTrustedDevice(
  supabase: any,
  userId: string,
  request: NextRequest,
) {
  try {
    const deviceToken = request.cookies.get(TRUSTED_DEVICE_COOKIE)?.value;

    if (!deviceToken) return false;

    const now = new Date().toISOString();

    // Look up the device in the database
    const { data: device, error } = await supabase
      .schema('core')
      .from('trusted_devices')
      .select('id, expires_at')
      .eq('device_token', deviceToken)
      .eq('user_id', userId)
      .gte('expires_at', now)
      .single();

    if (error || !device) {
      return false;
    }

    // Update last_used_at (fire-and-forget, don't block the request)
    supabase
      .schema('core')
      .from('trusted_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', device.id)
      .then(() => { });

    return true;
  } catch {
    return false;
  }
}

/**
 * Define URL patterns and their corresponding handlers.
 */
function getPatterns() {
  return [
    {
      pattern: new URLPattern({ pathname: '/auth/*?' }),
      handler: async (req: NextRequest, res: NextResponse) => {
        const { data } = await getUser(req, res);

        // the user is logged out, so we don't need to do anything
        if (!data?.claims) {
          return;
        }

        // check if we need to verify MFA (user is authenticated but needs to verify MFA)
        const isVerifyMfa = req.nextUrl.pathname === pathsConfig.auth.verifyMfa;

        // If user is logged in and does not need to verify MFA,
        // redirect to home page.
        if (!isVerifyMfa) {
          return NextResponse.redirect(
            new URL(pathsConfig.app.home, req.nextUrl.origin).href,
          );
        }
      },
    },
    {
      pattern: new URLPattern({ pathname: '/home/*?' }),
      handler: async (req: NextRequest, res: NextResponse) => {
        const { data } = await getUser(req, res);

        const origin = req.nextUrl.origin;
        const next = req.nextUrl.pathname;

        // If user is not logged in, redirect to sign in page.
        if (!data?.claims) {
          const signIn = pathsConfig.auth.signIn;
          const redirectPath = `${signIn}?next=${next}`;

          return NextResponse.redirect(new URL(redirectPath, origin).href);
        }

        // Redirect legacy bare /home/* routes to /org/home.
        // Only module-scoped routes are allowed: /home/sales, /home/hrms,
        // /home/services, /home/inventory, /home/funds.
        const allowedModulePrefixes = [
          '/home/sales',
          '/home/services',
          // '/home/hrms',
          // '/home/inventory',
          // '/home/funds',
        ];
        const isAllowedRoute = allowedModulePrefixes.some(
          (prefix) => next === prefix || next.startsWith(`${prefix}/`),
        );

        if (!isAllowedRoute) {
          return NextResponse.redirect(
            new URL(pathsConfig.app.home, origin).href,
          );
        }

        const supabase = createMiddlewareClient(req, res);

        const requiresMultiFactorAuthentication =
          await checkRequiresMultiFactorAuthentication(supabase);

        // If user requires MFA, check for a trusted device first
        if (requiresMultiFactorAuthentication) {
          const userId = data.claims.sub;
          const trustedDevice = await hasValidTrustedDevice(
            supabase,
            userId,
            req,
          );

          // If no valid trusted device, redirect to MFA verification
          if (!trustedDevice) {
            return NextResponse.redirect(
              new URL(pathsConfig.auth.verifyMfa, origin).href,
            );
          }
          // Trusted device is valid — allow the request to continue (skip MFA)
        }
      },
    },
    {
      pattern: new URLPattern({ pathname: '/org/*?' }),
      handler: async (req: NextRequest, res: NextResponse) => {
        const { data } = await getUser(req, res);

        const origin = req.nextUrl.origin;
        const next = req.nextUrl.pathname;

        // If user is not logged in, redirect to sign in page.
        if (!data?.claims) {
          const signIn = pathsConfig.auth.signIn;
          const redirectPath = `${signIn}?next=${next}`;

          return NextResponse.redirect(new URL(redirectPath, origin).href);
        }

        const supabase = createMiddlewareClient(req, res);

        const requiresMultiFactorAuthentication =
          await checkRequiresMultiFactorAuthentication(supabase);

        if (requiresMultiFactorAuthentication) {
          const userId = data.claims.sub;
          const trustedDevice = await hasValidTrustedDevice(
            supabase,
            userId,
            req,
          );

          if (!trustedDevice) {
            return NextResponse.redirect(
              new URL(pathsConfig.auth.verifyMfa, origin).href,
            );
          }
        }
      },
    },
  ];
}

/**
 * Match URL patterns to specific handlers.
 * @param url
 */
function matchUrlPattern(url: string) {
  const patterns = getPatterns();
  const input = url.split('?')[0];

  for (const pattern of patterns) {
    const patternResult = pattern.pattern.exec(input);

    if (patternResult !== null && 'pathname' in patternResult) {
      return pattern.handler;
    }
  }
}

/**
 * Set a unique request ID for each request.
 * @param request
 */
function setRequestId(request: Request) {
  request.headers.set('x-correlation-id', crypto.randomUUID());
}
