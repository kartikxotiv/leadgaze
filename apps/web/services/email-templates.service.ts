import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export const getEmailTemplatesService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.get(`/email/templates?workspaceId=${workspaceId}`);
    return response.data?.data || [];
  },
);

export const saveEmailTemplateService = asyncHandlerClient(
  async (payload: {
    id?: number;
    workspace_id: string;
    name: string;
    subject: string;
    html_body: string;
    variables?: string[];
  }) => {
    const response = await ApiClient.post('/email/templates', payload);
    return response.data?.data || null;
  },
);

export const deleteEmailTemplateService = asyncHandlerClient(
  async (id: number) => {
    const response = await ApiClient.delete(`/email/templates?id=${id}`);
    return response.data?.data || null;
  },
);

export const getWorkspaceVariablesService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.get(`/email/variables?workspaceId=${workspaceId}`);
    return response.data?.data || [];
  },
);

export const saveWorkspaceVariableService = asyncHandlerClient(
  async (payload: {
    id?: number;
    workspace_id: string;
    key: string;
    value: string;
  }) => {
    const response = await ApiClient.post('/email/variables', payload);
    return response.data?.data || null;
  },
);

export const deleteWorkspaceVariableService = asyncHandlerClient(
  async (id: number) => {
    const response = await ApiClient.delete(`/email/variables?id=${id}`);
    return response.data?.data || null;
  },
);
