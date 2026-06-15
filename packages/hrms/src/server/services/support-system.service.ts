import type {
  ApiSuccessResponse,
  SupportSystemDashboardResponse,
  SupportSystemRequest,
  SupportSystemRequestUpdatePayload,
} from '../../types/support-system.type';
import { asyncHandlerClient } from '../../utils/async-handler';
import ApiClient from '../../utils/axios-client';

const getSupportSystemDashboardService = asyncHandlerClient(async () => {
  const response =
    await ApiClient.get<ApiSuccessResponse<SupportSystemDashboardResponse>>(
      '/support-system',
    );

  return response.data;
});

const updateSupportSystemRequestService = asyncHandlerClient(
  async (requestId: string, payload: SupportSystemRequestUpdatePayload) => {
    const response = await ApiClient.patch<
      ApiSuccessResponse<SupportSystemRequest>
    >(`/support-system/${requestId}`, payload);

    return response.data;
  },
);

export { getSupportSystemDashboardService, updateSupportSystemRequestService };
