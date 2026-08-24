import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

/**
 * Ends the active impersonation session by calling the web app's /api/impersonate endpoint.
 */
export const exitImpersonationService = asyncHandlerClient(async () => {
  const response = await ApiClient.delete('/impersonate');
  return response.data;
});
