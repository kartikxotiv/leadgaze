import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export type EmailAccountAccessScope = 'private' | 'workspace';

export interface EmailAccount {
  id: number;
  workspace_id: string;
  email: string;
  from_name: string | null;
  provider: 'google' | 'outlook' | 'smtp';
  is_active: boolean | null;
  created_at: string | null;
  owner_user_id: string;
  access_scope: EmailAccountAccessScope;
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

const getWorkspaceEmailAccountService = asyncHandlerClient(async (workspaceId: string) => {
  const response = await ApiClient.get(
    `/email?workspace_id=${workspaceId}`,
  );
  return (response.data || []) as EmailAccount[];
});

const deleteEmailAccountService = asyncHandlerClient(async (id: string, workspaceId: string) => {
  const response = await ApiClient.delete(
    `/email?id=${id}&workspace_id=${workspaceId}`,
  );
  return response.data;
});

const submitEmailAccountService = asyncHandlerClient(async (workspaceId: string, payload: any) => {
  const response = await ApiClient.post(
    `/email/smtp?workspace_id=${workspaceId}`,
    payload
  );
  return response.data;
});

const updateEmailAccountService = asyncHandlerClient(
  async (
    payload: {
      id: number;
      workspace_id: string;
      is_active?: boolean;
      access_scope?: EmailAccountAccessScope;
    },
  ) => {
    const response = await ApiClient.patch('/email', payload);
    return response.data;
  },
);

const getEntityEmailActivityService = asyncHandlerClient(async (entityId: string, entityType: string, limit = 20, offset = 0) => {
  const response = await ApiClient.get(
    `/email/activity?entityId=${entityId}&entityType=${entityType}&limit=${limit}&offset=${offset}`,
  );
  return response.data || { data: [], count: 0 };
});

const getWorkspaceEmailActivityService = asyncHandlerClient(async (
  workspaceId: string,
  limit = 20,
  offset = 0,
  accountEmail?: string,
) => {
  const params = new URLSearchParams({
    workspaceId,
    limit: String(limit),
    offset: String(offset),
  });

  if (accountEmail) {
    params.set('accountEmail', accountEmail);
  }

  const response = await ApiClient.get(
    `/email/activity?${params.toString()}`,
  );
  return response.data || { data: [], count: 0 };
});

const saveEmailActivityService = asyncHandlerClient(async (payload: any) => {
  const response = await ApiClient.post(
    `/email/activity`,
    payload
  );
  return response.data?.data || null;
});

const deleteEmailActivityService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete(
    `/email/activity?id=${id}`,
  );
  return response.data;
});

export {
  getWorkspaceEmailAccountService,
  deleteEmailAccountService,
  submitEmailAccountService,
  updateEmailAccountService,
  getEntityEmailActivityService,
  getWorkspaceEmailActivityService,
  saveEmailActivityService,
  deleteEmailActivityService
};
