import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface Team {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  created_at: string;
  _count?: {
    members: number;
  };
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  workspace_id: string;
  is_manager: boolean;
  accounts?: {
    name: string;
    email: string;
    picture_url?: string;
  };
}

export interface CreateTeamPayload {
  name: string;
  description?: string;
}

export interface UpdateTeamPayload {
  name?: string;
  description?: string;
}

const getTeamsService = asyncHandlerClient(async (workspaceId: string) => {
  const response = await ApiClient.get(`/teams?workspaceId=${workspaceId}`);
  return response.data;
});

const createTeamService = asyncHandlerClient(
  async (workspaceId: string, payload: CreateTeamPayload) => {
    const response = await ApiClient.post('/teams', {
      workspaceId,
      ...payload,
    });
    return response.data;
  },
);

const updateTeamService = asyncHandlerClient(
  async (teamId: string, payload: UpdateTeamPayload) => {
    const response = await ApiClient.put(`/teams/${teamId}`, payload);
    return response.data;
  },
);

const deleteTeamService = asyncHandlerClient(async (teamId: string) => {
  const response = await ApiClient.delete(`/teams/${teamId}`);
  return response.data;
});

const getTeamMembersService = asyncHandlerClient(async (teamId: string) => {
  const response = await ApiClient.get(`/teams/${teamId}/members`);
  return response.data;
});

const addTeamMemberService = asyncHandlerClient(
  async (teamId: string, userId: string, isManager: boolean = false) => {
    const response = await ApiClient.post(`/teams/${teamId}/members`, {
      userId,
      isManager,
    });
    return response.data;
  },
);

const removeTeamMemberService = asyncHandlerClient(
  async (teamId: string, userId: string) => {
    const response = await ApiClient.delete(`/teams/${teamId}/members?userId=${userId}`);
    return response.data;
  },
);

const updateTeamMemberRoleService = asyncHandlerClient(
  async (teamId: string, userId: string, isManager: boolean) => {
    const response = await ApiClient.put(`/teams/${teamId}/members`, {
      userId,
      isManager,
    });
    return response.data;
  },
);

export {
  getTeamsService,
  createTeamService,
  updateTeamService,
  deleteTeamService,
  getTeamMembersService,
  addTeamMemberService,
  removeTeamMemberService,
  updateTeamMemberRoleService,
};
