export interface GetLeadsParams {
  workspaceId: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
  statusId?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc' | string;
  createdAtFrom?: string;
  createdAtTo?: string;
  updatedAtFrom?: string;
  updatedAtTo?: string;
  assignedLeadIds?: string[]; // IDs assigned to user, for access control
  visibleUserIds?: string[];  // IDs visible in hierarchy, for access control
  isOwner?: boolean;
}

export interface GetLeadDetailsParams {
  leadId: string;
  workspaceId: string;
  assignedLeadIds?: string[];
  visibleUserIds?: string[];
  isOwner?: boolean;
}
