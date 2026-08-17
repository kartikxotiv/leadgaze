'use client';

import React, { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardHeader, CardTitle } from '@kit/ui/card';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';

import {
    assignOpportunityToUser,
    getOpportunityAssignees,
    unassignOpportunityFromUser,
} from '~/services/opportunity-assignees.service';

import { AssignUserModal } from '../../leads/components/assign-user-modal';

interface OpportunityAssigneesProps {
    opportunityId: string;
    workspaceId: string;
    /** When true, renders without the Card wrapper (for embedding in accordion) */
    embedded?: boolean;
}

export function OpportunityAssignees({
    opportunityId,
    workspaceId,
    embedded = false,
}: OpportunityAssigneesProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: assignees = [], isLoading } = useQuery({
        queryKey: ['opportunity-assignees', opportunityId],
        queryFn: async () => {
            const res = await getOpportunityAssignees(opportunityId);
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
            assignOpportunityToUser(opportunityId, { assigned_to_user_id: userId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['opportunity-assignees', opportunityId] });
            toast.success('User assigned to opportunity');
            setIsModalOpen(false);
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || 'Failed to assign user';
            toast.error(message);
        },
    });

    const unassignMutation = useMutation({
        mutationFn: (assigneeId: string) =>
            unassignOpportunityFromUser(opportunityId, assigneeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['opportunity-assignees', opportunityId] });
            toast.success('User unassigned from opportunity');
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
                    <p className="secondary-text-small-bold text-muted-foreground mb-2">
                        No team members assigned yet
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => setIsModalOpen(true)}
                        className="secondary-text-small-bold text-leadgaze-dark dark:text-white gap-1.5 px-2"
                    >
                        <Plus className="h-4 w-4" />
                        Assign Member
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
                                        {(assignee.assignee_name?.trim() || '?').split(/\s+/).map((n, i) => i < 2 ? n[0] : '').join('').toUpperCase()}
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
                    leadId={opportunityId}
                    workspaceId={workspaceId}
                    currentAssignees={assignees as any}
                    onAssign={(userId) => assignMutation.mutate(userId)}
                    isLoading={assignMutation.isPending}
                />
            </>
        );
    }

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

            {content}

            <AssignUserModal
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                leadId={opportunityId}
                workspaceId={workspaceId}
                currentAssignees={assignees as any}
                onAssign={(userId) => assignMutation.mutate(userId)}
                isLoading={assignMutation.isPending}
            />
        </Card>
    );
}
