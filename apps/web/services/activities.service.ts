import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

// Types
export interface Note {
  id: string;
  content: string;
  created_at: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string | null;
  created_by_user?: { name: string; email: string };
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: string;
  is_completed: boolean;
  entity_type: string;
  entity_id: string;
  entity_name?: string | null;
  assigned_to_user?: { name: string; email: string };
  created_by_user?: { name: string; email: string };
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  location?: string;
  meeting_link?: string;
  start_time: string;
  end_time: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string | null;
  is_public?: boolean;
  created_by_user?: { name: string; email: string };
}

export interface Document {
  id: string;
  name: string;
  file_type?: string;
  size_bytes?: number;
  created_at: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string | null;
  created_by_user?: { name: string; email: string };
}

// Service Functions

// --- Notes ---
export const getNotesService = asyncHandlerClient(
  async (workspaceId: string, entityType?: string, entityId?: string) => {
    let url = `/notes?workspaceId=${workspaceId}`;
    if (entityType) url += `&entityType=${entityType}`;
    if (entityId) url += `&entityId=${entityId}`;
    const response = await ApiClient.get(url);
    return response.data?.data || [];
  },
);

export const createNoteService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    entity_type: string;
    entity_id: string;
    content: string;
  }) => {
    const response = await ApiClient.post('/notes', payload);
    return response.data?.data;
  },
);

export const updateNoteService = asyncHandlerClient(
  async (id: string, payload: { content: string }) => {
    const response = await ApiClient.patch(`/notes/${id}`, payload);
    return response.data?.data;
  },
);

export const deleteNoteService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete(`/notes/${id}`);
  return response.data;
});

// --- Reminders ---
export const getRemindersService = asyncHandlerClient(
  async (workspaceId: string, entityType?: string, entityId?: string) => {
    let url = `/reminders?workspaceId=${workspaceId}`;
    if (entityType) url += `&entityType=${entityType}`;
    if (entityId) url += `&entityId=${entityId}`;
    const response = await ApiClient.get(url);
    return response.data?.data || [];
  },
);

export const createReminderService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    entity_type: string;
    entity_id: string;
    title: string;
    description?: string;
    priority?: string;
    due_date?: string;
    assigned_to?: string;
  }) => {
    const response = await ApiClient.post('/reminders', payload);
    return response.data?.data;
  },
);

export const updateReminderService = asyncHandlerClient(
  async (
    id: string,
    payload: {
      title?: string;
      description?: string;
      priority?: string;
      due_date?: string;
      assigned_to?: string;
      is_completed?: boolean;
    },
  ) => {
    const response = await ApiClient.patch(`/reminders/${id}`, payload);
    return response.data?.data;
  },
);

export const deleteReminderService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete(`/reminders/${id}`);
  return response.data;
});

// --- Meetings ---
export const getMeetingsService = asyncHandlerClient(
  async (workspaceId: string, entityType?: string, entityId?: string) => {
    let url = `/meetings?workspaceId=${workspaceId}`;
    if (entityType) url += `&entityType=${entityType}`;
    if (entityId) url += `&entityId=${entityId}`;
    const response = await ApiClient.get(url);
    return response.data?.data || [];
  },
);

export const createMeetingService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    entity_type: string;
    entity_id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    meeting_link?: string;
  }) => {
    const response = await ApiClient.post('/meetings', payload);
    return response.data?.data;
  },
);

export const updateMeetingService = asyncHandlerClient(
  async (
    id: string,
    payload: {
      title?: string;
      description?: string;
      start_time?: string;
      end_time?: string;
      location?: string;
      meeting_link?: string;
    },
  ) => {
    const response = await ApiClient.patch(`/meetings/${id}`, payload);
    return response.data?.data;
  },
);

export const deleteMeetingService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete(`/meetings/${id}`);
  return response.data;
});

// --- Documents ---
export const getDocumentsService = asyncHandlerClient(
  async (workspaceId: string, entityType?: string, entityId?: string) => {
    let url = `/documents?workspaceId=${workspaceId}`;
    if (entityType) url += `&entityType=${entityType}`;
    if (entityId) url += `&entityId=${entityId}`;
    const response = await ApiClient.get(url);
    return response.data?.data || [];
  },
);

export const createDocumentService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    entity_type: string;
    entity_id: string;
    file: File;
  }) => {
    const formData = new FormData();
    formData.append('workspace_id', payload.workspace_id);
    formData.append('entity_type', payload.entity_type);
    formData.append('entity_id', payload.entity_id);
    formData.append('file', payload.file);

    const response = await ApiClient.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data?.data;
  },
);

export const updateDocumentService = asyncHandlerClient(
  async (id: string, payload: { name: string }) => {
    const response = await ApiClient.patch(`/documents/${id}`, payload);
    return response.data?.data;
  },
);

export const deleteDocumentService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete(`/documents/${id}`);
  return response.data;
});
