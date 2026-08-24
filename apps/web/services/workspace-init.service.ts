import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

// Type definitions for workspace initialization
export interface WorkspaceRole {
  id: string;
  workspace_id: string;
  role_key: string;
  role_name: string;
  color?: string | null;
  hierarchy_level: number;
  product_key?: string | null;
  is_system: boolean;
  permissions: Permission[];
}

export interface Permission {
  module: string;
  feature: string;
  access_level: 'none' | 'own' | 'team' | 'all';
  can_access: boolean;
  can_view_sensitive_data: boolean;
  can_override_owner: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  member_id: string;
  status: 'pending' | 'accepted' | 'inactive' | 'removed';
  company_logo_url?: string | null;
  billing_country?: string | null;
  roles: Record<string, WorkspaceRole>;
  currentRole: WorkspaceRole;
  currentProductKey: string;
  localization?: {
    timezone: string;
    date_format: string;
    time_format: string;
    default_currency: string;
    enabled_currencies: string[];
    exchange_rates?: any[];
  };
}

export interface WorkspaceMember {
  id: string;
  user_id: string;
  status: string;
  product_key?: string | null;
  role_id: string;
  created_at: string;
  role: {
    id: string;
    role_key: string;
    role_name: string;
    hierarchy_level: number;
    product_key?: string | null;
  };
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string | null;
  };
}

export interface DashboardData {
  summary: {
    total_leads: number;
    total_contacts: number;
    total_accounts: number;
    total_opportunities: number;
  };
  recent_activity: {
    new_leads_7d: number;
    new_contacts_7d: number;
  };
  workspace_info: {
    id: string;
    created_at: string;
    timezone?: string;
  };
}

export interface UserPreferences {
  id: string;
  email: string;
  name: string;
  picture?: string | null;
  timezone: string;
  language: string;
  theme: string;
  last_active_workspace?: string | null;
  workspace_count: number;
  auto_selected_workspace: boolean;
}

export interface SessionMetadata {
  initialized_at: number;
  workspace_id?: string | null;
  user_id: string;
  total_workspaces: number;
}

export interface WorkspaceInitData {
  user_workspaces: Workspace[];
  current_workspace: {
    team_members: WorkspaceMember[];
    dashboard_data: DashboardData;
  };
  user_preferences: UserPreferences;
  session_metadata: SessionMetadata;
}

/**
 * Initialize workspace session with all required data
 * Replaces 15+ individual API calls with single optimized request
 */
export const initializeWorkspaceSessionService = asyncHandlerClient(
  async (workspaceId?: string | null): Promise<WorkspaceInitData> => {
    const response = await ApiClient.post('/auth/workspace-init', {
      workspaceId: workspaceId || null,
    });
    
    if (!response.data?.data) {
      throw new Error('Invalid workspace initialization response');
    }
    
    return response.data.data as WorkspaceInitData;
  }
);

/**
 * Health check for workspace initialization endpoint
 */
export const checkWorkspaceInitHealthService = asyncHandlerClient(
  async (): Promise<{ status: string; timestamp: string }> => {
    const response = await ApiClient.get('/auth/workspace-init');
    return response.data.data;
  }
);

/**
 * Utility: Transform workspace data for legacy compatibility
 * Use this if you need to maintain compatibility with existing RBAC provider structure
 */
export const transformWorkspaceForLegacyRBAC = (
  workspaces: Workspace[],
  currentWorkspaceId?: string | null
): {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
} => {
  const currentWorkspace = currentWorkspaceId 
    ? workspaces.find(w => w.id === currentWorkspaceId) || null
    : workspaces.length === 1 ? workspaces[0] : null;

  return {
    workspaces,
    currentWorkspace,
  };
};

/**
 * Utility: Extract team members by product key
 */
export const getTeamMembersByProduct = (
  teamMembers: WorkspaceMember[],
  productKey?: string | null
): WorkspaceMember[] => {
  if (!productKey) return teamMembers;
  
  return teamMembers.filter(member => 
    member.product_key === productKey || 
    member.product_key === null // Global roles apply to all products
  );
};

/**
 * Utility: Check if user has permission for specific module/feature
 */
export const hasPermission = (
  workspace: Workspace,
  module: string,
  feature: string,
  accessLevel?: 'own' | 'team' | 'all'
): boolean => {
  if (!workspace?.currentRole?.permissions) return false;

  const permission = workspace.currentRole.permissions.find(
    p => p.module === module && p.feature === feature
  );

  if (!permission) return false;
  if (!permission.can_access) return false;

  if (accessLevel && permission.access_level !== accessLevel) {
    return false;
  }

  return true;
};

/**
 * Utility: Check if user can access module (with owner/admin bypass)
 */
export const canAccessModule = (
  workspace: Workspace,
  userId: string,
  module: string,
  feature: string = 'view'
): boolean => {
  if (!workspace) return false;

  // Owner or Admin role bypass
  const role = workspace.currentRole;
  if (
    workspace.owner_id === userId ||
    role.role_key === 'admin' ||
    (role.hierarchy_level ?? 0) >= 100
  ) {
    return true;
  }

  return hasPermission(workspace, module, feature);
};