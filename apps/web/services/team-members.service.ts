import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role_id: string;
  status: 'pending' | 'accepted' | 'inactive' | 'removed';
  is_primary_contact: boolean;
  invited_by?: string;
  invited_at?: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields from related tables
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
  role?: {
    id: string;
    role_name: string;
    role_key: string;
    hierarchy_level: number;
    color?: string;
  };
}

interface InviteMemberPayload {
  email: string;
  role_id: string;
}

interface UpdateMemberPayload {
  role_id?: string;
  status?: 'accepted' | 'inactive' | 'removed';
  is_primary_contact?: boolean;
}

const getMembersService = asyncHandlerClient(async (workspaceId: string) => {
  const response = await ApiClient.get(
    `/team-members?workspaceId=${workspaceId}`,
  );
  return response.data;
});

const getMemberByIdService = asyncHandlerClient(async (memberId: string) => {
  const response = await ApiClient.get(`/team-members/${memberId}`);
  return response.data;
});

const inviteMemberService = asyncHandlerClient(
  async (workspaceId: string, payload: InviteMemberPayload) => {
    const response = await ApiClient.post('/team-members/invite', {
      workspaceId,
      ...payload,
    });
    return response.data;
  },
);

const updateMemberService = asyncHandlerClient(
  async (memberId: string, payload: UpdateMemberPayload) => {
    const response = await ApiClient.put(`/team-members/${memberId}`, payload);
    return response.data;
  },
);

const removeMemberService = asyncHandlerClient(async (memberId: string) => {
  const response = await ApiClient.delete(`/team-members/${memberId}`);
  return response.data;
});

const resendInvitationService = asyncHandlerClient(async (memberId: string) => {
  const response = await ApiClient.post(
    `/team-members/${memberId}/resend-invitation`,
  );
  return response.data;
});

const acceptInviteService = asyncHandlerClient(
  async (token: string, userId: string) => {
    const response = await ApiClient.post('/team-members/invite/accept', {
      token,
      userId,
    });
    return response.data;
  },
);

const validateInviteTokenService = asyncHandlerClient(async (token: string) => {
  const response = await ApiClient.get(
    `/team-members/invite/validate?token=${token}`,
  );

  return response.data;
});

export {
  getMembersService,
  getMemberByIdService,
  inviteMemberService,
  updateMemberService,
  removeMemberService,
  resendInvitationService,
  acceptInviteService,
  validateInviteTokenService,
  type WorkspaceMember,
  type InviteMemberPayload,
  type UpdateMemberPayload,
};
