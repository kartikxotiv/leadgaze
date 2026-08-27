export interface GetRemindersParams {
  workspaceId: string;
  entityType?: string | null;
  entityId?: string | null;
  status?: string | null;
  priority?: string | null;
  searchTerm?: string;
  createdByIds?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  updatedAtFrom?: string;
  updatedAtTo?: string;
  isWorkspaceOwner?: boolean;
  userId?: string;
  page?: number | null;
  limit?: number | null;
  module?: string;
}

export interface ReminderItem {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  due_date: string;
  priority: string;
  is_completed?: boolean;
  completed_at: string | null;
  entity_type: string;
  entity_id: string;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_to_user?: { name?: string | null; email?: string | null } | null;
  created_by_user?: { name?: string | null; email?: string | null } | null;
  entity_name?: string;
}

export interface CorePaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
