'use client';

import React, { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { ScrollArea } from '@kit/ui/scroll-area';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import type { LeadAssigneeWithDetails } from '~/services/lead-assignees.service';
import { getSeatAssignmentsService } from '~/services/subscription.service';
import { getWorkspaceMembersService } from '~/services/workspace-members.service';

interface AssignUserModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  workspaceId: string;
  currentAssignees: LeadAssigneeWithDetails[];
  onAssign: (userId: string) => void;
  isLoading: boolean;
}

export function AssignUserModal({
  isOpen,
  onOpenChange,
  leadId,
  workspaceId,
  currentAssignees,
  onAssign,
  isLoading,
}: AssignUserModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { currentWorkspace } = useRBAC();
  const ownerId = currentWorkspace?.owner_id;

  // Get all workspace members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['workspace-members', workspaceId, 'sales'],
    queryFn: async () => {
      const res = await getWorkspaceMembersService(workspaceId, 'sales');

      return res;
    },
    enabled: !!workspaceId,
  });

  // Get active Sales seat assignments
  const { data: seatAssignmentsData, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['module-seat-assignments', workspaceId, 'sales'],
    queryFn: () => getSeatAssignmentsService(workspaceId, 'sales'),
    enabled: !!workspaceId,
  });

  const isLoaderActive = membersLoading || assignmentsLoading;

  // Get list of currently assigned user IDs
  const assignedUserIds = useMemo(
    () => new Set(currentAssignees.map((a) => a.assigned_to_user_id)),
    [currentAssignees],
  );

  // Get list of active Sales seat assignment user IDs
  const salesUserIds = useMemo(() => {
    const assignments = seatAssignmentsData?.data || [];
    return new Set(
      assignments.filter((a: any) => a.is_active).map((a: any) => a.user_id)
    );
  }, [seatAssignmentsData]);

  // Filter members based on search, exclude already assigned users, and limit to users with Sales seats (or owner)
  const availableMembers = useMemo(() => {
    return members.filter((member: any) => {
      const isAlreadyAssigned = assignedUserIds.has(member.id);
      if (isAlreadyAssigned) return false;

      // Ensure the user has active Sales seat assignment or is the workspace owner
      const hasAccess = salesUserIds.has(member.id) || (ownerId && member.id === ownerId);
      if (!hasAccess) return false;

      const searchLower = debouncedSearchQuery.toLowerCase();
      return (
        (member.full_name?.toLowerCase().includes(searchLower) ?? false) ||
        (member.email?.toLowerCase().includes(searchLower) ?? false)
      );
    });
  }, [members, debouncedSearchQuery, assignedUserIds, salesUserIds, ownerId]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Team Member</DialogTitle>
          <DialogDescription>
            Select a team member to assign to this lead
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 custom-spacing-x-y py-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={isLoaderActive || isLoading}
            />
          </div>

          {/* Members List */}
          <div className="h-[300px] rounded-lg border p-2 overflow-auto">
            {isLoaderActive ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                  <p className="text-muted-foreground text-sm">
                    Loading members...
                  </p>
                </div>
              </div>
            ) : availableMembers.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  {currentAssignees.length === members.length
                    ? 'All members are already assigned'
                    : 'No members found'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableMembers.map((member: any) => (
                  <button
                    key={member.id}
                    onClick={() => onAssign(member.id)}
                    disabled={isLoading}
                    className="hover:bg-muted/50 w-full rounded-lg border p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-full">
                        <AvatarImage src={member.avatar_url || ''} alt={member.full_name || 'User'} className="object-cover" />
                        <AvatarFallback className="text-xs bg-[#E0E7FF] text-leadgaze-dark dark:text-white font-bold">
                          {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="primary-text-medium text-leadgaze-dark">
                          {member.full_name || 'Unknown'}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Currently Assigned Badge */}
          {currentAssignees.length > 0 && (
            <div className="border-t pt-2">
              <p className="text-muted-foreground mb-2 text-xs font-medium">
                Currently assigned ({currentAssignees.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {currentAssignees.map((assignee) => (
                  <Badge key={assignee.id} variant="secondary">
                    {assignee.assignee_name || 'Unknown'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
