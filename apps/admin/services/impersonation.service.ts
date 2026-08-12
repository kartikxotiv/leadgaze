import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface StartImpersonationParams {
  target_user_id: string;
  workspace_id: string;
  reason: string;
}

export interface ImpersonationSession {
  session_id: string;
  expires_at: string;
  /**
   * One-time-use hashed token from supabase.auth.admin.generateLink({ type: 'magiclink' }).
   * The web portal's /auth/callback?token_hash=...&type=magiclink exchanges this for
   * a real Supabase session.
   */
  token_hash: string;
}

/**
 * Start an impersonation session for a target user.
 * Returns a token_hash so the web portal can establish a real auth session
 * via the /api/impersonate route.
 */
export const startImpersonationService = asyncHandlerClient(
  async (params: StartImpersonationParams): Promise<ImpersonationSession> => {
    const response = await ApiClient.post('/impersonation', params);
    const data = response.data?.data?.data ?? response.data?.data ?? response.data;
    return data as ImpersonationSession;
  },
);

/**
 * End an active impersonation session.
 * Clears the lg_impersonation cookie on the server.
 */
export const endImpersonationService = asyncHandlerClient(
  async (
    sessionId: string,
    action: 'completed' | 'terminated' = 'completed',
  ): Promise<{ session_id: string; status: string }> => {
    const response = await ApiClient.patch(`/impersonation/${sessionId}`, { action });
    const data = response.data?.data?.data ?? response.data?.data ?? response.data;
    return data as { session_id: string; status: string };
  },
);
