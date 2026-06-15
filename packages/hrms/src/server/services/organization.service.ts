import { CreateOrganizationPayload } from '~/types/organization.type';
import { asyncHandlerClient } from '~/utils/async-handler';

import ApiClient from '../utils/axios-client';

const createOrganizationService = asyncHandlerClient(
  async (data: CreateOrganizationPayload) => {
    const response = await ApiClient.post('/organizations', data);
    return response.data;
  },
);

export { createOrganizationService };
