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
  assignAccountToUser,
  getAccountAssignees,
  unassignAccountFromUser,
} from '~/services/account-assignees.service';

import { AssignUserModal } from '../../leads/components/assign-user-modal';

interface AccountAssigneesProps {
  accountId: string;
  workspaceId: string;
  /** When true, renders without the CardWidgetContainer wrapper (for embedding in accordion) */
  embedded?: boolean;
}

function getAssigneeInitials(assignee: any) {
  const source =
    assignee.assignee_name?.trim() || assignee.assignee_email?.trim() || '?';
  const parts = source.split(/\s+/);
  const firstInitial = parts[0]?.charAt(0) || '?';
  const secondInitial = parts[1]?.charAt(0) || '';

  return `${firstInitial}${secondInitial}`.toUpperCase();
}

export function AccountAssignees({
  accountId,
  workspaceId,
  embedded = false,
}: AccountAssigneesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: assignees = [], isLoading } = useQuery({
    queryKey: ['account-assignees', accountId],
    queryFn: async () => {
      const res = await getAccountAssignees(accountId);
      return (res?.data || res || []) as Array<{
        id: string;
        assigned_to_user_id: string;
        assignee_name?: string;
        assignee_email?: string;
        assignee_picture?: string;
        is_primary_assignee: boolean;
      }>;
    },
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) =>
      assignAccountToUser(accountId, { assigned_to_user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-assignees', accountId] });
      toast.success('User assigned to account');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to assign user';
      toast.error(message);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (assigneeId: string) =>
      unassignAccountFromUser(accountId, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-assignees', accountId] });
      toast.success('User unassigned from account');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to unassign user';
      toast.error(message);
    },
  });

  const content = (
    <div className={embedded ? '' : 'px-6 py-4'}>
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
          {assignees?.map((assignee) => (
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
  );

  if (embedded) {
    return (
      <>
        {content}
        <AssignUserModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          leadId={accountId}
          workspaceId={workspaceId}
          currentAssignees={assignees as any}
          onAssign={(userId) => assignMutation.mutate(userId)}
          isLoading={assignMutation.isPending}
        />
      </>
    );
  }

  return (
    <CardWidgetContainer
      className="mt-6"
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
      {content}
      <AssignUserModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        leadId={accountId}
        workspaceId={workspaceId}
        currentAssignees={assignees as any}
        onAssign={(userId) => assignMutation.mutate(userId)}
        isLoading={assignMutation.isPending}
      />
    </CardWidgetContainer>
  );
}
