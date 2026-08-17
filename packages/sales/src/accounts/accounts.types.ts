export interface GetAccountsParams {
  workspaceId: string;
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
  isOwner?: boolean;
  visibleUserIds?: string[];
  assignedAccountIds?: string[];
}
