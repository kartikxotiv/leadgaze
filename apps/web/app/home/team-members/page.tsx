'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Clock,
  Edit2,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getRolesService } from '~/services/roles.service';
import {
  type WorkspaceMember,
  getMembersService,
  removeMemberService,
  resendInvitationService,
} from '~/services/team-members.service';

import { InviteMemberDialog } from './components/invite-member-dialog';
import { UpdateMemberDialog } from './components/update-member-dialog';

export default function TeamMembersPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useRBAC();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [updatingMember, setUpdatingMember] = useState<WorkspaceMember | null>(
    null,
  );
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  // Fetch members
  const {
    data: membersData = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workspaceMembers', currentWorkspace?.id],
    queryFn: () => getMembersService(currentWorkspace?.id || ''),
    enabled: !!currentWorkspace?.id,
  });

  // Prefetch roles so they're available immediately when invite dialog opens
  useQuery({
    queryKey: ['workspaceRoles', currentWorkspace?.id],
    queryFn: async () => {
      const res = await getRolesService(currentWorkspace?.id || '');
      return res?.data;
    },
    enabled: !!currentWorkspace?.id,
  });

  const members = (membersData?.data || [])?.filter(
    (m: WorkspaceMember) => m.status !== 'removed',
  );
  const activeMembers = members.filter(
    (m: WorkspaceMember) => m.status === 'accepted',
  );
  const pendingMembers = members.filter(
    (m: WorkspaceMember) => m.status === 'pending',
  );

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: removeMemberService,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaceMembers', currentWorkspace?.id],
      });
      toast.success('Member removed successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to remove member');
    },
  });

  // Resend invitation mutation
  const resendMutation = useMutation({
    mutationFn: resendInvitationService,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaceMembers', currentWorkspace?.id],
      });
      toast.success('Invitation resent successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to resend invitation');
    },
  });

  const handleRemoveMember = (memberId: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      removeMutation.mutate(memberId);
    }
  };

  const handleResendInvitation = (memberId: string) => {
    resendMutation.mutate(memberId);
  };

  const handleEditMember = (member: WorkspaceMember) => {
    setUpdatingMember(member);
    setUpdateDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <Badge className="gap-1 border-green-500/20 bg-green-500/10 text-green-500 hover:bg-green-500/20">
            <Check className="h-3 w-3" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="gap-1 border-yellow-500/20 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 dark:text-yellow-500">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="secondary" className="gap-1">
            Inactive
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRoleColor = (role: any) => {
    return role?.color || '#6b7280';
  };

  return (
    <ModuleGuard module="team_members">
      <PageHeader
        title="Team Members"
        description="Manage your workspace team members and permissions"
      />
      <PageBody>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Total Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{members.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{activeMembers.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Pending Invitations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {pendingMembers.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Members Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Workspace Members</CardTitle>
                  <CardDescription>
                    Manage team members and their roles
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setInviteDialogOpen(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Invite Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                </div>
              ) : error ? (
                <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-4">
                  Failed to load team members
                </div>
              ) : members.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
                  <p className="text-muted-foreground">No team members yet</p>
                  <Button
                    onClick={() => setInviteDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    Invite First Member
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Primary Contact</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member: WorkspaceMember) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="bg-secondary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
                                {(
                                  member.user?.email?.charAt(0) || 'M'
                                ).toUpperCase()}
                              </div>
                              <span className="font-medium">
                                {member.user?.user_metadata?.full_name ||
                                  'Team Member'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {member.user?.email}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor: getRoleColor(member.role),
                                }}
                              />
                              <span className="font-medium">
                                {member.role?.role_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(member.status)}</TableCell>
                          <TableCell>
                            {member.is_primary_contact ? (
                              <Badge variant="secondary">Primary</Badge>
                            ) : (
                              <span className="text-muted-foreground/50 text-xs">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {member.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleResendInvitation(member.id)
                                  }
                                  className="gap-2"
                                  disabled={resendMutation.isPending}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditMember(member)}
                                className="gap-2"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                                disabled={removeMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dialogs */}
        <InviteMemberDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />

        {updatingMember && (
          <UpdateMemberDialog
            member={updatingMember}
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
            onSuccess={() => setUpdatingMember(null)}
          />
        )}
      </PageBody>
    </ModuleGuard>
  );
}
