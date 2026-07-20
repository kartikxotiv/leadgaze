import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

const importTicketsService = asyncHandlerClient(
  async (payload: { workspaceId: string; data: any[] }) => {
    const response = await ApiClient.post('/services/tickets/import', payload);
    return response.data;
  },
);

export { importTicketsService };
