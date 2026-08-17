export interface GetMeetingsParams {
  workspaceId: string;
  entityType?: string | null;
  entityId?: string | null;
  statuses?: string | null;
  timeframe?: string | null;
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
}

export interface MeetingItem {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string | null;
  meeting_link: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  created_by_user?: { name?: string | null; email?: string | null } | null;
  participants?: any[];
}
