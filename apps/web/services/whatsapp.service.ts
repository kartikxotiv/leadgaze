import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';
import type { LeadCreationMode } from '@kit/integration-whatsapp';

export const getWhatsAppSettingsService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.get(`/workspaces/${workspaceId}/whatsapp`);
    return response.data?.data;
  },
);

export const connectWhatsAppService = asyncHandlerClient(
  async (workspaceId: string, params: {
    accessToken: string;
    phoneNumberId: string;
    wabaId: string;
  }) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/whatsapp`, {
      action: 'connect',
      ...params,
    });
    return response.data?.data as { connected: boolean; phoneNumber: string; verifiedName: string };
  },
);

export const disconnectWhatsAppService = asyncHandlerClient(
  async (workspaceId: string, accountId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/whatsapp`, {
      action: 'disconnect',
      accountId,
    });
    return response.data?.data;
  },
);

export const syncWhatsAppTemplatesService = asyncHandlerClient(
  async (workspaceId: string, accountId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/whatsapp`, {
      action: 'sync-templates',
      accountId,
    });
    return response.data?.data as { synced: number };
  },
);

export const syncWhatsAppNumbersService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/whatsapp`, {
      action: 'sync-numbers',
    });
    return response.data?.data as { synced: number; wabasCount: number };
  },
);

export const updateWhatsAppSettingsService = asyncHandlerClient(
  async (workspaceId: string, settings: {
    leadCreationMode?: LeadCreationMode;
    leadKeywords?: string[];
    leadMessageThreshold?: number;
  }) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/whatsapp`, {
      action: 'update-settings',
      ...settings,
    });
    return response.data?.data;
  },
);

export const getWhatsAppConversationsService = asyncHandlerClient(
  async (workspaceId: string, params?: { status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const response = await ApiClient.get(
      `/workspaces/${workspaceId}/whatsapp/conversations?${searchParams.toString()}`,
    );
    return response.data?.data;
  },
);

export const getWhatsAppMessagesService = asyncHandlerClient(
  async (workspaceId: string, conversationId: string, params?: { page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));

    const response = await ApiClient.get(
      `/workspaces/${workspaceId}/whatsapp/conversations/${conversationId}/messages?${searchParams.toString()}`,
    );
    return response.data?.data;
  },
);

export const sendWhatsAppMessageService = asyncHandlerClient(
  async (workspaceId: string, conversationId: string, messageBody: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/whatsapp`, {
      action: 'send-message',
      conversationId,
      messageBody,
    });
    return response.data?.data;
  },
);

export const assignWhatsAppConversationService = asyncHandlerClient(
  async (workspaceId: string, conversationId: string, assignTo: string | null) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/whatsapp`, {
      action: 'assign-conversation',
      conversationId,
      assignTo,
    });
    return response.data?.data;
  },
);

export const resolveWhatsAppConversationService = asyncHandlerClient(
  async (workspaceId: string, conversationId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/whatsapp`, {
      action: 'resolve-conversation',
      conversationId,
    });
    return response.data?.data;
  },
);

export const reopenWhatsAppConversationService = asyncHandlerClient(
  async (workspaceId: string, conversationId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/whatsapp`, {
      action: 'reopen-conversation',
      conversationId,
    });
    return response.data?.data;
  },
);

export const addWhatsAppNoteService = asyncHandlerClient(
  async (workspaceId: string, conversationId: string, noteBody: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/whatsapp`, {
      action: 'add-note',
      conversationId,
      noteBody,
    });
    return response.data?.data;
  },
);

export const convertToLeadService = asyncHandlerClient(
  async (workspaceId: string, conversationId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/whatsapp`, {
      action: 'convert-to-lead',
      conversationId,
    });
    return response.data?.data as { leadId: string };
  },
);

export const checkWebhookSubscriptionService = asyncHandlerClient(
  async (workspaceId: string, accountId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/whatsapp`, {
      action: 'check-webhook-subscription',
      accountId,
    });
    return response.data?.data as {
      wabaId: string;
      currentSubscribers: { id: string; name: string; subscribed_fields: string[] }[];
      resubscribeResult: { success: boolean; error?: string };
    };
  },
);
