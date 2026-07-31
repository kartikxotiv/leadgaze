import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

/**
 * Records the authenticated user's interest in a coming-soon module.
 * @param moduleId - The ID of the module the user is interested in.
 */
export const recordUserInterestService = asyncHandlerClient(
  async (moduleId: string) => {
    const response = await ApiClient.post('/user-interests', { moduleId });
    return response.data as { success: boolean; message: string };
  },
);
