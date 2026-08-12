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
  assignContactToUser,
  getContactAssignees,
  unassignContactFromUser,
} from '~/services/contact-assignees.service';
import type { LeadAssigneeWithDetails } from '~/services/lead-assignees.service';

import { AssignUserModal } from '../../leads/components/assign-user-modal';

interface ContactAssigneesProps {
  contactId: string;
  workspaceId: string;
  /** When true, renders without the CardWidgetContainer wrapper (for embedding in accordion) */
  embedded?: boolean;
}

interface ContactAssignee {
  id: string;
  assigned_to_user_id: string;
  assignee_name?: string;
  assignee_email?: string;
  assignee_picture?: string | null;
  is_primary_assignee: boolean;
}

function getErrorMessage(error: unknown, fallback: string) {
  const response = (error as { response?: { data?: { message?: unknown } } })
    ?.response;

  return typeof response?.data?.message === 'string'
    ? response.data.message
    : fallback;
}

function getAssigneeInitials(assignee: ContactAssignee) {
  const source =
    assignee.assignee_name?.trim() || assignee.assignee_email?.trim() || '?';
  const parts = source.split(/\s+/);
  const firstInitial = parts[0]?.charAt(0) || '?';
  const secondInitial = parts[1]?.charAt(0) || '';

  return `${firstInitial}${secondInitial}`.toUpperCase();
}

export function ContactAssignees({
  contactId,
  workspaceId,
  embedded = false,
}: ContactAssigneesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: assignees = [], isLoading } = useQuery<ContactAssignee[]>({
    queryKey: ['contact-assignees', contactId],
    queryFn: async () => {
      const res = await getContactAssignees(contactId);
      return (res?.data || res || []) as ContactAssignee[];
    },
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) =>
      assignContactToUser(contactId, { assigned_to_user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['contact-assignees', contactId],
      });
      toast.success('User assigned to contact');
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to assign user'));
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (assigneeId: string) =>
      unassignContactFromUser(contactId, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['contact-assignees', contactId],
      });
      toast.success('User unassigned from contact');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to unassign user'));
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
          <p className="secondary-text-small-bold text-muted-foreground mb-2">
            No team members assigned yet
          </p>
          <Button
            variant="outline"
            onClick={() => setIsModalOpen(true)}
            className="secondary-text-small-bold text-leadgaze-dark dark:text-white gap-1.5 px-2"
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
              className="p-2 !border-x-0 !border-t-0 !border-b !rounded-none border-b-accordion"
              icon={
                assignee.assignee_picture ? (
                  <img
                    src={assignee.assignee_picture}
                    alt={assignee.assignee_name || 'User'}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-leadgaze-primary text-sm font-semibold text-white">
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
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
          leadId={contactId}
          workspaceId={workspaceId}
          currentAssignees={assignees as LeadAssigneeWithDetails[]}
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
        leadId={contactId}
        workspaceId={workspaceId}
        currentAssignees={assignees as LeadAssigneeWithDetails[]}
        onAssign={(userId) => assignMutation.mutate(userId)}
        isLoading={assignMutation.isPending}
      />
    </CardWidgetContainer>
  );
}
