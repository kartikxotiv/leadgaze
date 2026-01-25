'use client';

import React, { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { ScrollArea } from '@kit/ui/scroll-area';

import type { LeadAssigneeWithDetails } from '~/services/lead-assignees.service';
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
  console.log({ workspaceId });

  // Get all workspace members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      console.log('Fetching workspace members for workspaceId:', workspaceId);
      const res = await getWorkspaceMembersService(workspaceId);
      console.log({ res });
      return res;
    },
    enabled: !!workspaceId,
  });

  // Get list of currently assigned user IDs
  const assignedUserIds = useMemo(
    () => new Set(currentAssignees.map((a) => a.assigned_to_user_id)),
    [currentAssignees],
  );

  // Filter members based on search and exclude already assigned users
  const availableMembers = useMemo(() => {
    return members.filter((member) => {
      console.log({ assignedUserIds, member });
      const isAlreadyAssigned = assignedUserIds.has(member.id);
      if (isAlreadyAssigned) return false;

      const searchLower = searchQuery.toLowerCase();
      return (
        (member.full_name?.toLowerCase().includes(searchLower) ?? false) ||
        (member.email?.toLowerCase().includes(searchLower) ?? false)
      );
    });
  }, [members, searchQuery, assignedUserIds]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Team Member</DialogTitle>
          <DialogDescription>
            Select a team member to assign to this lead
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={membersLoading || isLoading}
            />
          </div>

          {/* Members List */}
          <ScrollArea className="h-[300px] rounded-lg border p-3">
            {membersLoading ? (
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
                {availableMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => onAssign(member.id)}
                    disabled={isLoading}
                    className="hover:bg-muted/50 w-full rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      {member.avatar_url && (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name || 'User'}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
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
          </ScrollArea>

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

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
