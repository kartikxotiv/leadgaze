import type { JwtPayload, SupabaseClient } from '@supabase/supabase-js';

import { checkRequiresMultiFactorAuthentication } from './check-requires-mfa';

const MULTI_FACTOR_AUTH_VERIFY_PATH = '/auth/verify';
const SIGN_IN_PATH = '/auth/sign-in';

/**
 * @name requireUser
 * @description Require a session to be present in the request
 * @param client
 * @param isMfaBypassed Optional async function that returns true if MFA should be bypassed (e.g. trusted device)
 */
export async function requireUser(
  client: SupabaseClient,
  isMfaBypassed?: () => Promise<boolean>,
): Promise<
  | {
      error: null;
      data: JwtPayload;
    }
  | (
      | {
          error: AuthenticationError;
          data: null;
          redirectTo: string;
        }
      | {
          error: MultiFactorAuthError;
          data: null;
          redirectTo: string;
        }
    )
> {
  const { data, error } = await client.auth.getClaims();

  if (!data?.claims || error) {
    return {
      data: null,
      error: new AuthenticationError(),
      redirectTo: SIGN_IN_PATH,
    };
  }

  const requiresMfa = await checkRequiresMultiFactorAuthentication(client);

  // If the user requires multi-factor authentication,
  // check if they have a valid trusted device bypass before rejecting.
  if (requiresMfa) {
    const bypassed = isMfaBypassed ? await isMfaBypassed() : false;

    if (!bypassed) {
      return {
        data: null,
        error: new MultiFactorAuthError(),
        redirectTo: MULTI_FACTOR_AUTH_VERIFY_PATH,
      };
    }
  }

  return {
    error: null,
    data: {
      ...data.claims,
      id: data.claims.sub,
    },
  };
}

class AuthenticationError extends Error {
  constructor() {
    super(`Authentication required`);
  }
}

class MultiFactorAuthError extends Error {
  constructor() {
    super(`Multi-factor authentication required`);
  }
}
