import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

interface Role {
  id: string;
  workspace_id: string;
  role_key: string;
  role_name: string;
  description?: string;
  hierarchy_level: number;
  is_system: boolean;
  is_active: boolean;
  color?: string;
}

interface CreateRolePayload {
  role_key: string;
  role_name: string;
  description?: string;
  color?: string;
  permissions?: RolePermission[];
}

interface UpdateRolePayload extends Partial<CreateRolePayload> {
  is_active?: boolean;
}

interface RolePermission {
  module_feature_id: string;
  can_access: boolean;
  access_level: 'none' | 'own' | 'team' | 'all';
}

interface Module {
  id: string;
  module_key: string;
  module_name: string;
  description?: string;
}

interface ModuleFeature {
  id: string;
  module_id: string;
  feature_key: string;
  feature_name: string;
  description?: string;
  feature_type: string;
}

const getRolesService = asyncHandlerClient(async (workspaceId: string) => {
  const response = await ApiClient.get(`/roles?workspaceId=${workspaceId}`);
  return response.data;
});

const getRoleByIdService = asyncHandlerClient(async (roleId: string) => {
  const response = await ApiClient.get(`/roles/${roleId}`);
  return response.data;
});

const createRoleService = asyncHandlerClient(
  async (workspaceId: string, payload: CreateRolePayload) => {
    const response = await ApiClient.post('/roles', {
      workspaceId,
      ...payload,
    });
    return response.data;
  },
);

const updateRoleService = asyncHandlerClient(
  async (roleId: string, payload: UpdateRolePayload) => {
    const response = await ApiClient.put(`/roles/${roleId}`, payload);
    return response.data;
  },
);

const deleteRoleService = asyncHandlerClient(async (roleId: string) => {
  const response = await ApiClient.delete(`/roles/${roleId}`);
  return response.data;
});

const getModulesService = asyncHandlerClient(async () => {
  const response = await ApiClient.get('/roles/modules');
  return response.data;
});

const getRolePermissionsService = asyncHandlerClient(async (roleId: string) => {
  const response = await ApiClient.get(`/roles/${roleId}/permissions`);
  return response.data;
});

const updateRolePermissionsService = asyncHandlerClient(
  async (roleId: string, permissions: RolePermission[]) => {
    const response = await ApiClient.put(`/roles/${roleId}/permissions`, {
      permissions,
    });
    return response.data;
  },
);

const reorderRolesService = asyncHandlerClient(
  async (payload: { workspaceId: string; orderedRoleIds: string[] }) => {
    const response = await ApiClient.put('/roles/reorder', payload);
    return response.data;
  },
);

export {
  getRolesService,
  getRoleByIdService,
  createRoleService,
  updateRoleService,
  deleteRoleService,
  reorderRolesService,
  getModulesService,
  getRolePermissionsService,
  updateRolePermissionsService,
  type Role,
  type CreateRolePayload,
  type UpdateRolePayload,
  type RolePermission,
  type Module,
  type ModuleFeature,
};
