'use client';

import React, { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

import {
  assignContactToUser,
  getContactAssignees,
  unassignContactFromUser,
} from '~/services/contact-assignees.service';

import { AssignUserModal } from '../../../leads/components/assign-user-modal';

interface ContactAssigneesProps {
  contactId: string;
  workspaceId: string;
}

export function ContactAssignees({
  contactId,
  workspaceId,
}: ContactAssigneesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: assignees = [], isLoading } = useQuery({
    queryKey: ['contact-assignees', contactId],
    queryFn: async () => {
      const res = await getContactAssignees(contactId);
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
      assignContactToUser(contactId, { assigned_to_user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-assignees', contactId] });
      toast.success('User assigned to contact');
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to assign user';
      toast.error(message);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (assigneeId: string) =>
      unassignContactFromUser(contactId, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-assignees', contactId] });
      toast.success('User unassigned from contact');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to unassign user';
      toast.error(message);
    },
  });

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <CardTitle>Assigned Team Members</CardTitle>
        </div>
        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-2"
          disabled={assignMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          Assign Member
        </Button>
      </CardHeader>

      <CardContent>
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
          <div className="space-y-2">
            {assignees?.map((assignee) => (
              <div
                key={assignee.id}
                className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
              >
                <div className="flex flex-1 items-center gap-3">
                  {assignee.assignee_picture && (
                    <img
                      src={assignee.assignee_picture}
                      alt={assignee.assignee_name || 'User'}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {assignee.assignee_name || 'Unknown'}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {assignee.assignee_email}
                    </p>
                  </div>
                  {assignee.is_primary_assignee && (
                    <Badge variant="default" className="ml-2">
                      Primary
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => unassignMutation.mutate(assignee.id)}
                  disabled={unassignMutation.isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AssignUserModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        leadId={contactId}
        workspaceId={workspaceId}
        currentAssignees={assignees as any}
        onAssign={(userId) => assignMutation.mutate(userId)}
        isLoading={assignMutation.isPending}
      />
    </Card>
  );
}
