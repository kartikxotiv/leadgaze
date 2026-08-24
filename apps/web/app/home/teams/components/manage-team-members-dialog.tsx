'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Loader2, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@kit/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@kit/ui/popover';
import { cn } from '@kit/ui/utils';
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
import { Label } from '@kit/ui/label';

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
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [openMemberSelect, setOpenMemberSelect] = useState(false);

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
    mutationFn: async (userIds: string[]) => {
      await Promise.all(
        userIds.map((userId) => addTeamMemberService(team.id, userId, false))
      );
    },
    onSuccess: (_data, userIds) => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', team.id] });
      queryClient.invalidateQueries({ queryKey: ['workspaceTeams', currentWorkspace?.id] });
      toast.success(userIds.length === 1 ? 'Member added to team' : 'Members added to team');
      setSelectedUserIds([]);
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
    if (selectedUserIds.length === 0) return;
    addMemberMutation.mutate(selectedUserIds);
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
            <div>
              <Label>Add Workspace Member</Label>
              <Popover open={openMemberSelect} onOpenChange={setOpenMemberSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openMemberSelect}
                    className="w-full justify-between h-[32px] font-normal"
                  >
                    <div className="flex flex-wrap gap-1">
                      {selectedUserIds.length === 0 && (
                        <span className="text-muted-foreground">Select members...</span>
                      )}
                      {selectedUserIds.map((userId) => {
                        const member = salesWorkspaceMembers.find((m: WorkspaceMember) => m.user_id === userId);
                        return (
                          <Badge key={userId} variant="secondary" className="gap-1 pr-1">
                            {member?.user?.user_metadata?.full_name || member?.user?.email || userId}
                            <span
                              role="button"
                              tabIndex={0}
                              className="rounded-full hover:bg-muted-foreground/20"
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
                              }}
                            >
                              <X className="h-3 w-3" />
                            </span>
                          </Badge>
                        );
                      })}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search members..." />
                    <CommandList>
                      <CommandEmpty>No available members to add</CommandEmpty>
                      <CommandGroup>
                        {availableMembers.map((member: WorkspaceMember) => (
                          <CommandItem
                            key={member.user_id}
                            value={member.user?.user_metadata?.full_name || member.user?.email || member.user_id}
                            onSelect={() => {
                              setSelectedUserIds((prev) =>
                                prev.includes(member.user_id)
                                  ? prev.filter((id) => id !== member.user_id)
                                  : [...prev, member.user_id]
                              );
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedUserIds.includes(member.user_id) ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {member.user?.user_metadata?.full_name || member.user?.email}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="">
              <Button
                onClick={handleAddMember}
                disabled={selectedUserIds.length === 0 || addMemberMutation.isPending}
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
                          <Badge variant="secondary text-leadgaze-dark dark:text-white">
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
        <DialogFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              toast.success('Team member changes saved');
              onOpenChange(false);
            }}
          >
            Save Changes
          </Button>
        </DialogFooter>
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
