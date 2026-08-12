import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface Lead {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  alt_email?: string;
  phone_number?: string;
  mobile_number?: string;
  linkedin_url?: string;
  company_name?: string;
  company_website?: string;
  company_linkedin_url?: string;
  job_title?: string;
  department?: string;
  industry_id?: string;
  company_size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  annual_revenue?: number;
  location?: string;
  timezone?: string;
  status_id: string;
  source_id?: string;
  trigger?: string;
  lead_score: number;
  owner_id?: string;
  created_by: string;
  last_contact_date?: string;
  next_followup_date?: string;
  contacted_count: number;
  tags?: string[];
  custom_fields?: Record<string, any>;
  notes?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  is_converted_to_account?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  // Joined relations
  status?: {
    id: string;
    status_name: string;
    status_key: string;
    color: string;
    icon: string;
  };
  source?: {
    id: string;
    source_name: string;
    source_key: string;
    color: string;
    icon: string;
  };
  owner?: {
    id: string;
    email: string;
    name: string;
  };
  industry?: {
    id: string;
    industry_name: string;
  };
  created_by_account?: {
    id: string;
    email: string;
    name: string;
  };
  updated_by_account?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface CreateLeadPayload {
  workspace_id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  alt_email?: string;
  phone_number?: string;
  mobile_number?: string;
  linkedin_url?: string;
  company_name?: string;
  company_website?: string;
  company_linkedin_url?: string;
  job_title?: string;
  department?: string;
  industry_id?: string;
  company_size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  annual_revenue?: number;
  location?: string;
  timezone?: string;
  status_id: string;
  source_id?: string;
  trigger?: string;
  lead_score?: number;
  owner_id?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateLeadPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  alt_email?: string;
  phone_number?: string;
  mobile_number?: string;
  linkedin_url?: string;
  company_name?: string;
  company_website?: string;
  company_linkedin_url?: string;
  job_title?: string;
  department?: string;
  industry_id?: string;
  company_size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  annual_revenue?: number;
  location?: string;
  timezone?: string;
  status_id?: string;
  source_id?: string;
  trigger?: string;
  lead_score?: number;
  owner_id?: string;
  notes?: string;
  tags?: string[];
}

const getLeadsService = asyncHandlerClient(
  async (params: {
    workspaceId: string;
    page?: number;
    limit?: number;
    searchTerm?: string;
    statusId?: string | string[];
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc' | null;
    createdAtFrom?: string;
    createdAtTo?: string;
    updatedAtFrom?: string;
    updatedAtTo?: string;
  }) => {
    const {
      workspaceId,
      page = 1,
      limit = 20,
      searchTerm = '',
      statusId = '',
      sortColumn = '',
      sortDirection = '',
      createdAtFrom = '',
      createdAtTo = '',
      updatedAtFrom = '',
      updatedAtTo = '',
    } = params;
    const statusParam = Array.isArray(statusId) ? statusId.join(',') : statusId;
    const response = await ApiClient.get(
      `/leads?workspaceId=${workspaceId}&page=${page}&limit=${limit}&searchTerm=${searchTerm}&statusId=${statusParam}&sortColumn=${sortColumn}&sortDirection=${sortDirection || ''}&createdAtFrom=${createdAtFrom}&createdAtTo=${createdAtTo}&updatedAtFrom=${updatedAtFrom}&updatedAtTo=${updatedAtTo}`,
    );
    // response.data = { message, data: [...], count }
    return {
      data: (response.data?.data || []) as Lead[],
      count: (response.data?.count || 0) as number,
      statusBreakdown: (response.data?.statusBreakdown || {}) as Record<
        string,
        { count: number }
      >,
    };
  },
);

const getLeadByIdService = asyncHandlerClient(async (leadId: string) => {
  const response = await ApiClient.get(`/leads/${leadId}`);
  // API returns { message, data } structure
  return response.data?.data || null;
});

const createLeadService = asyncHandlerClient(
  async (payload: CreateLeadPayload) => {
    const response = await ApiClient.post('/leads', payload);
    // API returns { message, data } structure
    return response.data?.data || null;
  },
);

const getLeadSourcesService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.get(
      `/leads/sources?workspaceId=${workspaceId}`,
    );
    // response.data = { success, statusCode, message, data: [...] }
    const sources = response.data?.data || [];

    return sources;
  },
);

const createLeadSourceService = asyncHandlerClient(
  async (workspaceId: string, sourceName: string) => {
    const response = await ApiClient.post('/leads/sources', {
      workspace_id: workspaceId,
      source_name: sourceName,
    });
    return response.data?.data;
  },
);

const getLeadStatusesService = asyncHandlerClient(
  async (params: { workspaceId: string; includeInactive?: boolean }) => {
    const { workspaceId, includeInactive = false } = params;
    const url = `/leads/statuses?workspaceId=${workspaceId}${includeInactive ? '&includeInactive=true' : ''}`;
    const response = await ApiClient.get(url);
    // response.data = { success, statusCode, message, data: [...] }
    const statuses = response.data?.data || [];

    return statuses;
  },
);

const getAffectedLeadsForStatusService = asyncHandlerClient(
  async (params: { statusId: string; workspaceId: string; limit?: number; offset?: number }) => {
    const { statusId, workspaceId, limit = 10, offset = 0 } = params;
    const response = await ApiClient.get(
      `/leads/statuses/${statusId}/affected?workspaceId=${workspaceId}&limit=${limit}&offset=${offset}`,
    );
    return response.data?.data as { total_count: number; records: { id: string; name: string; email: string | null }[] };
  },
);

const reassignLeadStatusService = asyncHandlerClient(
  async (params: { statusId: string; new_status_id: string; workspace_id: string }) => {
    const { statusId, new_status_id, workspace_id } = params;
    const response = await ApiClient.patch(`/leads/statuses/${statusId}/reassign`, {
      new_status_id,
      workspace_id,
    });
    return response.data?.data as { reassigned_count: number; disabled_status_id: string };
  },
);

const createLeadStatusService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    status_name: string;
    color?: string;
    icon?: string;
    is_closed?: boolean;
  }) => {
    const response = await ApiClient.post('/leads/statuses', payload);
    return response.data?.data;
  },
);

const updateLeadStatusService = asyncHandlerClient(
  async (
    statusId: string,
    payload: {
      status_name?: string;
      color?: string;
      icon?: string;
      is_closed?: boolean;
      is_active?: boolean;
    },
  ) => {
    const response = await ApiClient.patch(`/leads/statuses/${statusId}`, payload);
    return response.data?.data;
  },
);

const deleteLeadStatusService = asyncHandlerClient(
  async (statusId: string) => {
    const response = await ApiClient.delete(`/leads/statuses/${statusId}`);
    return response.data?.data;
  },
);

const reorderLeadStatusesService = asyncHandlerClient(
  async (payload: { workspaceId: string; orderedStatusIds: string[] }) => {
    const response = await ApiClient.put('/leads/statuses/reorder', payload);
    return response.data?.data;
  },
);

const updateLeadService = asyncHandlerClient(
  async (leadId: string, payload: UpdateLeadPayload) => {
    const response = await ApiClient.patch(`/leads/${leadId}`, payload);
    // API returns { message, data } structure
    return response.data?.data || null;
  },
);

const deleteLeadService = asyncHandlerClient(async (leadId: string) => {
  const response = await ApiClient.delete(`/leads/${leadId}`);
  // API returns { message, data } structure
  return response.data?.data || null;
});

const convertLeadService = asyncHandlerClient(
  async (leadId: string, payload: any) => {
    const response = await ApiClient.post(`/leads/${leadId}/convert`, payload);
    // API returns { message, data } structure
    return response.data?.data || null;
  },
);

const sendLeadEmailService = asyncHandlerClient(
  async (payload: {
    workspaceId: string;
    entityId?: string;
    entityType?: 'lead' | 'contact' | 'account' | 'opportunity';
    emailAccountId?: number;
    toEmails: string;
    subject: string;
    body: string;
    cc?: string | string[];
    bcc?: string | string[];
    scheduledAt?: string;
    emailId?: string;
  }) => {
    // console.log({ payload });

    const response = await ApiClient.post(`/email/send`, payload);
    return response.data?.data || null;
  },
);

const importLeadsService = asyncHandlerClient(
  async (payload: { workspaceId: string; data: any[] }) => {
    const response = await ApiClient.post('/leads/import', payload);
    return response.data;
  },
);

export {
  getLeadsService,
  getLeadByIdService,
  createLeadService,
  convertLeadService,
  getLeadSourcesService,
  createLeadSourceService,
  getLeadStatusesService,
  getAffectedLeadsForStatusService,
  reassignLeadStatusService,
  createLeadStatusService,
  updateLeadStatusService,
  deleteLeadStatusService,
  reorderLeadStatusesService,
  updateLeadService,
  deleteLeadService,
  sendLeadEmailService,
  importLeadsService,
};
