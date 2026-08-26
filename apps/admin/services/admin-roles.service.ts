import ApiClient from '~/utils/axios-client';

export interface AdminRole {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_system: boolean;
  created_at: string;
}

export interface AdminPermission {
  id: string;
  name: string;
  key: string;
  description?: string;
  category: string;
}

export interface AdminRolePermission {
  role_id: string;
  permission_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const getAdminRolesService = async () => {
  const response = await ApiClient.get('/roles');
  return (response.data?.data?.data || response.data?.data || []) as AdminRole[];
};

export const createAdminRoleService = async (payload: { name: string; slug: string; description: string }) => {
  const response = await ApiClient.post('/roles', payload);
  return response.data;
};

export const inviteAdminUserService = async (payload: { email: string; name: string; role_id: string }) => {
  const response = await ApiClient.post('/users/invite', payload);
  return response.data;
};

export const getAdminPermissionsService = async () => {
  const response = await ApiClient.get('/permissions');
  return (response.data?.data?.data || response.data?.data || []) as AdminPermission[];
};

export const getRolePermissionsService = async (roleId: string) => {
  const response = await ApiClient.get(`/roles/${roleId}/permissions`);
  return (response.data?.data?.data || response.data?.data || []) as AdminRolePermission[];
};

export const updateRolePermissionsService = async (payload: { roleId: string; permissions: any[] }) => {
  const response = await ApiClient.put(`/roles/${payload.roleId}/permissions`, { permissions: payload.permissions });
  return response.data;
};
