export interface GetDocumentsParams {
  workspaceId: string;
  entityType?: string | null;
  entityId?: string | null;
  type?: string | null;
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

export interface DocumentItem {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_url: string;
  file_type: string;
  size_bytes: number;
  category: string | null;
  is_deleted?: boolean;
  deleted_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_by_user?: { name?: string | null; email?: string | null } | null;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
}
