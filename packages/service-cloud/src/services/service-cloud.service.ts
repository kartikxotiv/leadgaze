import { ServiceCloudApiClient, asyncHandlerClient } from '../utils';

export type ServiceCloudRecord = Record<string, any>;

export const getServiceCloudResourceService = asyncHandlerClient(
  async (resource: string, workspaceId: string, params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams({ workspaceId, ...params });
    const res = await ServiceCloudApiClient.get(`/${resource}?${searchParams.toString()}`);
    return res.data?.data ?? [];
  },
);

export const createServiceCloudResourceService = asyncHandlerClient(
  async (resource: string, payload: ServiceCloudRecord) => {
    const res = await ServiceCloudApiClient.post(`/${resource}`, payload);
    return res.data?.data;
  },
);

export const updateServiceCloudResourceService = asyncHandlerClient(
  async (resource: string, payload: ServiceCloudRecord) => {
    const res = await ServiceCloudApiClient.patch(`/${resource}`, payload);
    return res.data?.data;
  },
);

export const deleteServiceCloudResourceService = asyncHandlerClient(
  async (resource: string, workspaceId: string, id: string) => {
    const res = await ServiceCloudApiClient.delete(`/${resource}?workspaceId=${workspaceId}&id=${id}`);
    return res.data?.data;
  },
);

export const getServiceCloudDashboardService = asyncHandlerClient(
  async (workspaceId: string) => {
    const res = await ServiceCloudApiClient.get(`/dashboard?workspaceId=${workspaceId}`);
    return res.data?.data;
  },
);

export const convertCoreEmailToServiceCloudTicketService = asyncHandlerClient(
  async (payload: ServiceCloudRecord) => {
    const res = await ServiceCloudApiClient.post('/email-to-ticket', payload);
    return res.data?.data;
  },
);

export const getServiceCloudTicketDetailService = asyncHandlerClient(
  async (workspaceId: string, ticketId: string) => {
    const res = await ServiceCloudApiClient.get(`/tickets/${ticketId}?workspaceId=${workspaceId}`);
    return res.data?.data;
  },
);

export const logServiceCloudTicketTimeService = asyncHandlerClient(
  async (workspaceId: string, ticketId: string, payload: ServiceCloudRecord) => {
    const res = await ServiceCloudApiClient.post(`/tickets/${ticketId}/time`, {
      ...payload,
      workspaceId,
    });
    return res.data?.data;
  },
);
