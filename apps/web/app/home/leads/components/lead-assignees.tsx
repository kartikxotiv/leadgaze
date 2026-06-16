'use client';

import React, { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';

import {
  assignLeadToUser,
  getLeadAssignees,
  unassignLeadFromUser,
} from '~/services/lead-assignees.service';

import { AssignUserModal } from './assign-user-modal';

interface LeadAssigneesProps {
  leadId: string;
  workspaceId: string;
}

function getAssigneeInitials(assignee: any) {
  const source =
    assignee.assignee_name?.trim() || assignee.assignee_email?.trim() || '?';
  const parts = source.split(/\s+/);
  const firstInitial = parts[0]?.charAt(0) || '?';
  const secondInitial = parts[1]?.charAt(0) || '';

  return `${firstInitial}${secondInitial}`.toUpperCase();
}

export function LeadAssignees({ leadId, workspaceId }: LeadAssigneesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: assignees = [], isLoading } = useQuery({
    queryKey: ['lead-assignees', leadId],
    queryFn: async () => {
      const res = await getLeadAssignees(leadId);
      return res?.data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) =>
      assignLeadToUser(leadId, { assigned_to_user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-assignees', leadId] });
      toast.success('User assigned to lead');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to assign user';
      toast.error(message);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (assigneeId: string) =>
      unassignLeadFromUser(leadId, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-assignees', leadId] });
      toast.success('User unassigned from lead');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to unassign user';
      toast.error(message);
    },
  });

  return (
    <CardWidgetContainer
      className="mt-4"
      title="Assigned Team Members"
      icon={<Users className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
      icon2={
        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-2"
          disabled={assignMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          Assign Member
        </Button>
      }
    >
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            Loading assignees...
          </div>
        ) : assignees.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4 text-sm">
              No team members assigned yet
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsModalOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Assign First Member
            </Button>
          </div>
        ) : (
          <CardWidgetList>
            {assignees?.map((assignee: any) => (
              <CardWidgetListItem
                key={assignee.id}
                icon={
                  assignee.assignee_picture ? (
                    <img
                      src={assignee.assignee_picture}
                      alt={assignee.assignee_name || 'User'}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                      {getAssigneeInitials(assignee)}
                    </div>
                  )
                }
                title={assignee.assignee_name || 'Unknown'}
                subtitle={assignee.assignee_email}
                badge={
                  assignee.is_primary_assignee ? (
                    <Badge variant="default">Primary</Badge>
                  ) : null
                }
                actions={
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => unassignMutation.mutate(assignee.id)}
                    disabled={unassignMutation.isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
            ))}
          </CardWidgetList>
        )}
      </div>

      <AssignUserModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        leadId={leadId}
        workspaceId={workspaceId}
        currentAssignees={assignees}
        onAssign={(userId) => assignMutation.mutate(userId)}
        isLoading={assignMutation.isPending}
      />
    </CardWidgetContainer>
  );
}
