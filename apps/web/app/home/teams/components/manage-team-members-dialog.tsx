'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { type WorkspaceMember, getMembersService } from '~/services/team-members.service';
import { getSeatAssignmentsService } from '~/services/subscription.service';
import {
  type Team,
  type TeamMember,
  addTeamMemberService,
  getTeamMembersService,
  removeTeamMemberService,
} from '~/services/teams.service';
import { CustomDeleteDialog } from '@kit/ui/custom-delete-dialog';

interface ManageTeamMembersDialogProps {
  team: Team;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageTeamMembersDialog({
  team,
  open,
  onOpenChange,
}: ManageTeamMembersDialogProps) {
  const { currentWorkspace } = useRBAC();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const [isRemoveMemberDialogOpen, setIsRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  // Fetch all workspace members
  // Fetch members for the Sales product used by workspace teams
  const { data: workspaceMembersData = [] } = useQuery({
    queryKey: ['workspaceMembers', currentWorkspace?.id, 'sales'],
    queryFn: () => getMembersService(currentWorkspace?.id || '', 'sales'),
    enabled: !!currentWorkspace?.id && open,
  });

  // Fetch sales module seat assignments to filter only sales users
  const { data: seatAssignmentsData = [] } = useQuery({
    queryKey: ['sales-seat-assignments', currentWorkspace?.id],
    queryFn: () => getSeatAssignmentsService(currentWorkspace?.id || '', 'sales'),
    enabled: !!currentWorkspace?.id && open,
  });

  const allWorkspaceMembers = (workspaceMembersData?.data || []).filter(
    (m: WorkspaceMember) => m.status === 'accepted'
  );

  // Filter to only include users with active sales module seats
  const salesSeatUserIds = new Set(
    (seatAssignmentsData?.data || [])
      .filter((a: { is_active?: boolean }) => a.is_active)
      .map((a: { user_id: string }) => a.user_id)
  );

  const salesWorkspaceMembers = Array.from(
    new Map(
      allWorkspaceMembers
        .filter((m: WorkspaceMember) => salesSeatUserIds.has(m.user_id))
        .map((member: WorkspaceMember) => [member.user_id, member] as const),
    ).values(),
  );

  // Fetch team members
  const { data: teamMembersData = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['teamMembers', team.id],
    queryFn: async () => {
      const res = await getTeamMembersService(team.id);
      return res?.data || [];
    },
    enabled: open,
  });

  const teamMembers = Array.isArray(teamMembersData) ? teamMembersData : [];

  // Mutations
  const addMemberMutation = useMutation({
    mutationFn: () => addTeamMemberService(team.id, selectedUserId, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', team.id] });
      queryClient.invalidateQueries({ queryKey: ['workspaceTeams', currentWorkspace?.id] });
      toast.success('Member added to team');
      setSelectedUserId('');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to add member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeTeamMemberService(team.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', team.id] });
      queryClient.invalidateQueries({ queryKey: ['workspaceTeams', currentWorkspace?.id] });
      toast.success('Member removed from team');
      setIsRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to remove member');
      setIsRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    },
  });

  const handleAddMember = () => {
    if (!selectedUserId) return;
    addMemberMutation.mutate();
  };

  // Filter out users who are already in the team
  const availableMembers = salesWorkspaceMembers.filter(
    (wm: WorkspaceMember) => !teamMembers.some((tm: TeamMember) => tm.user_id === wm.user_id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Members: {team.name}</DialogTitle>
          <DialogDescription>
            Add SDRs and Managers to this team.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {/* Add Member Section */}
          <div className="flex items-end gap-2 rounded-lg border bg-muted/30 p-2">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Add Workspace Member</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member: WorkspaceMember) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.user?.user_metadata?.full_name || member.user?.email}
                    </SelectItem>
                  ))}
                  {availableMembers.length === 0 && (
                    <div className="py-2 text-center text-sm text-muted-foreground">
                      No available members to add
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="pb-1">
            <Button
              onClick={handleAddMember}
              disabled={!selectedUserId || addMemberMutation.isPending}
              className="bg-leadgaze-primary hover:bg-leadgaze-primary text-white secondary-text-small-bold gap-1.5 px-2"
            >
              <UserPlus className="h-4 w-4" />
              Add to Team
            </Button>
            </div>
          </div>

          {/* Members List */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingMembers ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : teamMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No members in this team yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  teamMembers.map((member: TeamMember) => {
                    const wsMember = salesWorkspaceMembers.find(
                      (wm) => wm.user_id === member.user_id
                    );
                    
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.accounts?.name || 'Unknown User'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.accounts?.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {wsMember?.role?.role_name || 'Member'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMemberToRemove(member.user_id);
                              setIsRemoveMemberDialogOpen(true);
                            }}
                            disabled={removeMemberMutation.isPending}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
      <CustomDeleteDialog
        isOpen={isRemoveMemberDialogOpen}
        onOpenChange={setIsRemoveMemberDialogOpen}
        title="Remove Member"
        description="Are you sure you want to remove this member from the team? This action cannot be undone."
        onConfirm={() => {
          if (memberToRemove) {
            removeMemberMutation.mutate(memberToRemove);
          }
        }}
        isDeleting={removeMemberMutation.isPending}
      />
    </Dialog>
  );
}
