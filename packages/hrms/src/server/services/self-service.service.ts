import type {
  ApiSuccessResponse,
  SelfServiceDashboardResponse,
  SelfServicePayslipDetail,
  SelfServiceProfileUpdatePayload,
  SelfServiceRequest,
  SelfServiceRequestCreatePayload,
} from '~/types/self-service.type';
import { asyncHandlerClient } from '~/utils/async-handler';

import ApiClient from '../utils/axios-client';

const getSelfServiceDashboardService = asyncHandlerClient(async () => {
  const response =
    await ApiClient.get<ApiSuccessResponse<SelfServiceDashboardResponse>>(
      '/self-service',
    );

  return response.data;
});

const updateSelfServiceProfileService = asyncHandlerClient(
  async (payload: SelfServiceProfileUpdatePayload) => {
    const response = await ApiClient.patch<ApiSuccessResponse<unknown>>(
      '/self-service/profile',
      payload,
    );

    return response.data;
  },
);

const createSelfServiceRequestService = asyncHandlerClient(
  async (payload: SelfServiceRequestCreatePayload) => {
    const response = await ApiClient.post<
      ApiSuccessResponse<SelfServiceRequest>
    >('/self-service/requests', payload);

    return response.data;
  },
);

const getSelfServicePayslipDetailService = asyncHandlerClient(
  async (payslipId: string) => {
    const response = await ApiClient.get<
      ApiSuccessResponse<SelfServicePayslipDetail>
    >(`/self-service/payslips/${payslipId}`);

    return response.data;
  },
);

const downloadSelfServicePayslipService = asyncHandlerClient(
  async (payslipId: string) => {
    const response = await fetch(
      `/api/self-service/payslips/${payslipId}/download`,
      {
        credentials: 'include',
      },
    );

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);

      throw {
        message: errorPayload?.message ?? 'Unable to download payslip',
        statusCode: response.status,
      };
    }

    const fileNameMatch = response.headers
      .get('content-disposition')
      ?.match(/filename="?([^"]+)"?/i);

    return {
      blob: await response.blob(),
      fileName: fileNameMatch?.[1] ?? `payslip-${payslipId}.txt`,
    };
  },
);

export {
  createSelfServiceRequestService,
  downloadSelfServicePayslipService,
  getSelfServiceDashboardService,
  getSelfServicePayslipDetailService,
  updateSelfServiceProfileService,
};
