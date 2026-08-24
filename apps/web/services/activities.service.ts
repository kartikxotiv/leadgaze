import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

// Types
export interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string | null;
  created_by_user?: { name: string; email: string };
  is_closed?: boolean;
  closed_at?: string | null;
  closed_by?: string | null;
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
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
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
  created_by_user?: { name: string; email: string };
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface Document {
  id: string;
  name: string;
  file_type?: string;
  size_bytes?: number;
  created_at: string;
  updated_at?: string;
  updated_by?: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string | null;
  created_by_user?: { name: string; email: string };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: string;
  is_completed: boolean;
  completed_at?: string | null;
  completed_by?: string | null;
  entity_type: string;
  entity_id: string;
  entity_name?: string | null;
  created_by_user?: { name: string; email: string };
  completed_by_user?: { name: string; email: string };
  total_logged_minutes?: number | null;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface TaskTimeLog {
  id: string;
  workspace_id: string;
  task_id: string;
  user_id: string;
  duration_minutes: number;
  description?: string;
  logged_at: string;
  created_at: string;
  updated_at?: string;
  user?: { name: string; email: string };
}

// Service Functions

// --- Notes ---
export const getNotesService = asyncHandlerClient(
  async (
    workspaceId: string,
    entityType?: string,
    entityId?: string,
    status: 'active' | 'closed' = 'active',
    filters?: {
      page?: number;
      limit?: number;
      searchTerm?: string;
      createdAtFrom?: string;
      createdAtTo?: string;
      updatedAtFrom?: string;
      updatedAtTo?: string;
      createdByIds?: string[];
      module?: string;
    },
  ) => {
    let url = `/notes?workspaceId=${workspaceId}&status=${status}`;
    if (entityType) url += `&entityType=${entityType}`;
    if (entityId) url += `&entityId=${entityId}`;
    if (filters) {
      if (filters.page) url += `&page=${filters.page}`;
      if (filters.limit) url += `&limit=${filters.limit}`;
      if (filters.searchTerm) url += `&searchTerm=${encodeURIComponent(filters.searchTerm)}`;
      if (filters.createdAtFrom) url += `&createdAtFrom=${filters.createdAtFrom}`;
      if (filters.createdAtTo) url += `&createdAtTo=${filters.createdAtTo}`;
      if (filters.updatedAtFrom) url += `&updatedAtFrom=${filters.updatedAtFrom}`;
      if (filters.updatedAtTo) url += `&updatedAtTo=${filters.updatedAtTo}`;
      if (filters.createdByIds && filters.createdByIds.length > 0) {
        url += `&createdByIds=${filters.createdByIds.join(',')}`;
      }
      if (filters.module) url += `&module=${filters.module}`;
    }
    const response = await ApiClient.get(url);
    if (response.data?.total !== undefined && (filters?.page || filters?.limit)) {
      return response.data;
    }
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
  async (id: string, payload: { content?: string; is_closed?: boolean }) => {
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
  async (
    workspaceId: string,
    entityType?: string,
    entityId?: string,
    filters?: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
      searchTerm?: string;
      createdAtFrom?: string;
      createdAtTo?: string;
      updatedAtFrom?: string;
      updatedAtTo?: string;
      createdByIds?: string[];
    },
  ) => {
    let url = `/reminders?workspaceId=${workspaceId}`;
    if (entityType) url += `&entityType=${entityType}`;
    if (entityId) url += `&entityId=${entityId}`;
    if (filters) {
      if (filters.page) url += `&page=${filters.page}`;
      if (filters.limit) url += `&limit=${filters.limit}`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.priority) url += `&priority=${filters.priority}`;
      if (filters.searchTerm) url += `&searchTerm=${encodeURIComponent(filters.searchTerm)}`;
      if (filters.createdAtFrom) url += `&createdAtFrom=${filters.createdAtFrom}`;
      if (filters.createdAtTo) url += `&createdAtTo=${filters.createdAtTo}`;
      if (filters.updatedAtFrom) url += `&updatedAtFrom=${filters.updatedAtFrom}`;
      if (filters.updatedAtTo) url += `&updatedAtTo=${filters.updatedAtTo}`;
      if (filters.createdByIds && filters.createdByIds.length > 0) {
        url += `&createdByIds=${filters.createdByIds.join(',')}`;
      }
    }
    const response = await ApiClient.get(url);
    if (response.data?.total !== undefined && (filters?.page || filters?.limit)) {
      return response.data;
    }
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
  async (
    workspaceId: string,
    entityType?: string,
    entityId?: string,
    filters?: {
      page?: number;
      limit?: number;
      statuses?: string;
      timeframe?: string;
      searchTerm?: string;
      createdAtFrom?: string;
      createdAtTo?: string;
      updatedAtFrom?: string;
      updatedAtTo?: string;
      createdByIds?: string[];
    },
  ) => {
    let url = `/meetings?workspaceId=${workspaceId}`;
    if (entityType) url += `&entityType=${entityType}`;
    if (entityId) url += `&entityId=${entityId}`;
    if (filters) {
      if (filters.page) url += `&page=${filters.page}`;
      if (filters.limit) url += `&limit=${filters.limit}`;
      if (filters.statuses) url += `&statuses=${filters.statuses}`;
      if (filters.timeframe) url += `&timeframe=${filters.timeframe}`;
      if (filters.searchTerm) url += `&searchTerm=${encodeURIComponent(filters.searchTerm)}`;
      if (filters.createdAtFrom) url += `&createdAtFrom=${filters.createdAtFrom}`;
      if (filters.createdAtTo) url += `&createdAtTo=${filters.createdAtTo}`;
      if (filters.updatedAtFrom) url += `&updatedAtFrom=${filters.updatedAtFrom}`;
      if (filters.updatedAtTo) url += `&updatedAtTo=${filters.updatedAtTo}`;
      if (filters.createdByIds && filters.createdByIds.length > 0) {
        url += `&createdByIds=${filters.createdByIds.join(',')}`;
      }
    }
    const response = await ApiClient.get(url);
    if (response.data?.total !== undefined && (filters?.page || filters?.limit)) {
      return response.data;
    }
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
  async (
    workspaceId: string,
    entityType?: string,
    entityId?: string,
    filters?: {
      page?: number;
      limit?: number;
      type?: string;
      searchTerm?: string;
      createdAtFrom?: string;
      createdAtTo?: string;
      updatedAtFrom?: string;
      updatedAtTo?: string;
      createdByIds?: string[];
    },
  ) => {
    let url = `/documents?workspaceId=${workspaceId}`;
    if (entityType) url += `&entityType=${entityType}`;
    if (entityId) url += `&entityId=${entityId}`;
    if (filters) {
      if (filters.page) url += `&page=${filters.page}`;
      if (filters.limit) url += `&limit=${filters.limit}`;
      if (filters.type) url += `&type=${filters.type}`;
      if (filters.searchTerm) url += `&searchTerm=${encodeURIComponent(filters.searchTerm)}`;
      if (filters.createdAtFrom) url += `&createdAtFrom=${filters.createdAtFrom}`;
      if (filters.createdAtTo) url += `&createdAtTo=${filters.createdAtTo}`;
      if (filters.updatedAtFrom) url += `&updatedAtFrom=${filters.updatedAtFrom}`;
      if (filters.updatedAtTo) url += `&updatedAtTo=${filters.updatedAtTo}`;
      if (filters.createdByIds && filters.createdByIds.length > 0) {
        url += `&createdByIds=${filters.createdByIds.join(',')}`;
      }
    }
    const response = await ApiClient.get(url);
    if (response.data?.total !== undefined && (filters?.page || filters?.limit)) {
      return response.data;
    }
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

// --- Tasks ---
export const getTasksService = asyncHandlerClient(
  async (workspaceId: string, entityType?: string, entityId?: string, status: 'active' | 'completed' = 'active') => {
    let url = `/tasks?workspaceId=${workspaceId}&status=${status}`;
    if (entityType) url += `&entityType=${entityType}`;
    if (entityId) url += `&entityId=${entityId}`;
    const response = await ApiClient.get(url);
    return response.data?.data || [];
  },
);

export const createTaskService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    entity_type: string;
    entity_id: string;
    title: string;
    description?: string;
    due_date?: string;
    priority?: string;
  }) => {
    const response = await ApiClient.post('/tasks', payload);
    return response.data?.data;
  },
);

export const updateTaskService = asyncHandlerClient(
  async (
    id: string,
    payload: {
      title?: string;
      description?: string;
      due_date?: string;
      priority?: string;
      is_completed?: boolean;
    },
  ) => {
    const response = await ApiClient.patch(`/tasks/${id}`, payload);
    return response.data?.data;
  },
);

export const deleteTaskService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete(`/tasks/${id}`);
  return response.data;
});

// --- Task Time Logs ---
export const getTaskTimeLogsService = asyncHandlerClient(
  async (workspaceId: string, taskId: string) => {
    const response = await ApiClient.get(`/tasks/${taskId}/time-logs?workspaceId=${workspaceId}`);
    return response.data?.data || [];
  },
);

export const createTaskTimeLogService = asyncHandlerClient(
  async (
    taskId: string,
    payload: {
      workspace_id: string;
      duration_minutes: number;
      description?: string;
      logged_at?: string;
    },
  ) => {
    const response = await ApiClient.post(`/tasks/${taskId}/time-logs`, payload);
    return response.data?.data;
  },
);

