import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface UserItem {
  id: string;
  full_name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Member' | 'Viewer';
  status: 'Active' | 'Invited' | 'Suspended';
  workspaces_count: number;
  last_login: string;
  created_at: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  role?: string | string[];
  status?: string | string[];
  sortColumn?: string;
  sortDirection?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
}

export const getUsersService = asyncHandlerClient(
  async (params: GetUsersParams = {}) => {
    const {
      page = 1,
      limit = 15,
      searchTerm = '',
      role = '',
      status = '',
      sortColumn = '',
      sortDirection = '',
      createdAtFrom = '',
      createdAtTo = '',
    } = params;

    const roleParam = Array.isArray(role) ? role.join(',') : role;
    const statusParam = Array.isArray(status) ? status.join(',') : status;

    const response = await ApiClient.get(
      `/users?page=${page}&limit=${limit}&searchTerm=${encodeURIComponent(
        searchTerm,
      )}&role=${encodeURIComponent(roleParam)}&status=${encodeURIComponent(
        statusParam,
      )}&sortColumn=${encodeURIComponent(
        sortColumn,
      )}&sortDirection=${encodeURIComponent(
        sortDirection,
      )}&createdAtFrom=${encodeURIComponent(
        createdAtFrom,
      )}&createdAtTo=${encodeURIComponent(createdAtTo)}`,
    );

    return {
      data: (response.data?.data?.data || response.data?.data || []) as UserItem[],
      count: (response.data?.data?.count ?? response.data?.count ?? 0) as number,
    };
  },
);
