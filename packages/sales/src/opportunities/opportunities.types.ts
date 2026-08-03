export interface GetOpportunitiesParams {
  workspaceId: string;
  accountId?: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc' | string;
  createdAtFrom?: string;
  createdAtTo?: string;
  updatedAtFrom?: string;
  updatedAtTo?: string;
  createdByIds?: string;
  stageId?: string;
  isOwner?: boolean;
  visibleUserIds?: string[];
  assignedOpportunityIds?: string[];
}
