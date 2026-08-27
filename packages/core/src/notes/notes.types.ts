export interface GetNotesParams {
  workspaceId: string;
  entityType?: string | null;
  entityId?: string | null;
  status?: string | null;
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

export interface NoteItem {
  id: string;
  workspace_id: string;
  note: string;
  content?: string;
  is_closed?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  created_by_user?: { name?: string | null; email?: string | null } | null;
  note_relations?: any[];
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
}
