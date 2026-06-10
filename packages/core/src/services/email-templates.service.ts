import { asyncHandlerClient } from '../utils/async-handler';
import CoreApiClient from '../utils/axios-client';

export const getCoreEmailTemplatesService = asyncHandlerClient(async (workspaceId: string) => {
  const response = await CoreApiClient.get(`/email-templates?workspaceId=${workspaceId}`);
  return response.data?.data ?? [];
});

export const saveCoreEmailTemplateService = asyncHandlerClient(async (payload: {
  id?: number;
  workspace_id: string;
  name: string;
  subject: string;
  html_body: string;
  text_body?: string;
  variables?: string[];
}) => {
  const response = await CoreApiClient.post('/email-templates', payload);
  return response.data?.data ?? null;
});

export const deleteCoreEmailTemplateService = asyncHandlerClient(async (id: number, workspaceId: string) => {
  const response = await CoreApiClient.delete(`/email-templates?id=${id}&workspaceId=${workspaceId}`);
  return response.data?.data ?? null;
});

export const getCoreEmailVariablesService = asyncHandlerClient(async (workspaceId: string) => {
  const response = await CoreApiClient.get(`/email-variables?workspaceId=${workspaceId}`);
  return response.data?.data ?? [];
});

export const saveCoreEmailVariableService = asyncHandlerClient(async (payload: {
  id?: number;
  workspace_id: string;
  key: string;
  value: string;
}) => {
  const response = await CoreApiClient.post('/email-variables', payload);
  return response.data?.data ?? null;
});

export const deleteCoreEmailVariableService = asyncHandlerClient(async (id: number, workspaceId: string) => {
  const response = await CoreApiClient.delete(`/email-variables?id=${id}&workspaceId=${workspaceId}`);
  return response.data?.data ?? null;
});
