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
    statusId?: string;
  }) => {
    const {
      workspaceId,
      page = 1,
      limit = 20,
      searchTerm = '',
      statusId = '',
    } = params;
    const response = await ApiClient.get(
      `/leads?workspaceId=${workspaceId}&page=${page}&limit=${limit}&searchTerm=${searchTerm}&statusId=${statusId}`,
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
  async (workspaceId: string) => {
    const response = await ApiClient.get(
      `/leads/statuses?workspaceId=${workspaceId}`,
    );
    // response.data = { success, statusCode, message, data: [...] }
    const statuses = response.data?.data || [];

    return statuses;
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

export {
  getLeadsService,
  getLeadByIdService,
  createLeadService,
  convertLeadService,
  getLeadSourcesService,
  createLeadSourceService,
  getLeadStatusesService,
  updateLeadService,
  deleteLeadService,
  sendLeadEmailService,
};
