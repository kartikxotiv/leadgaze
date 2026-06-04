import { asyncHandlerClient } from '../utils/async-handler';
import CoreApiClient from '../utils/axios-client';

export type CoreEmailAccountAccessScope = 'private' | 'workspace';

export interface CoreEmailAccount {
  id: number;
  workspace_id: string;
  email: string;
  from_name: string | null;
  provider: 'google' | 'outlook' | 'smtp' | 'imap';
  is_active: boolean | null;
  is_sync_enabled?: boolean | null;
  inbound_enabled?: boolean | null;
  outbound_enabled?: boolean | null;
  created_at: string | null;
  owner_user_id: string | null;
  access_scope: CoreEmailAccountAccessScope;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  is_owner: boolean;
  can_manage: boolean;
  can_change_access: boolean;
  can_send: boolean;
  can_view_inbox: boolean;
}

export const getCoreEmailAccountsService = asyncHandlerClient(async (workspaceId: string) => {
  const response = await CoreApiClient.get(`/email-accounts?workspace_id=${workspaceId}`);
  return (response.data || []) as CoreEmailAccount[];
});

export const createCoreSmtpAccountService = asyncHandlerClient(async (workspaceId: string, payload: Record<string, unknown>) => {
  const response = await CoreApiClient.post(`/email-accounts?workspace_id=${workspaceId}`, payload);
  return response.data?.data ?? response.data;
});

export const updateCoreEmailAccountService = asyncHandlerClient(async (payload: {
  id: number;
  workspace_id: string;
  is_active?: boolean;
  access_scope?: CoreEmailAccountAccessScope;
}) => {
  const response = await CoreApiClient.patch('/email-accounts', payload);
  return response.data?.data ?? response.data;
});

export const deleteCoreEmailAccountService = asyncHandlerClient(async (id: number | string, workspaceId: string) => {
  const response = await CoreApiClient.delete(`/email-accounts?id=${id}&workspace_id=${workspaceId}`);
  return response.data?.data ?? response.data;
});
