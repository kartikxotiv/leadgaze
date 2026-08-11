'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Phone, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
import { CustomDeleteDialog } from '@kit/ui/custom-delete-dialog';

import { useLocalization } from '~/lib/localization/localization-provider';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getCallsService, deleteCallService } from '~/services/calls.service';
import { LogCallDialog } from '../leads/components/log-call-dialog';

interface EntityCallsProps {
    entityType: string;
    entityId: string;
}

export function EntityCalls({ entityType, entityId }: EntityCallsProps) {
    const { currentWorkspace: workspace } = useRBAC();
    const { formatDate } = useLocalization();
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [callToDelete, setCallToDelete] = useState<string | null>(null);

    const { data: calls = [], isLoading } = useQuery({
        queryKey: ['calls', workspace?.id, entityType, entityId],
        queryFn: () => {
            if (!workspace?.id) return Promise.resolve([]);
            return getCallsService({
                workspaceId: workspace.id,
                entityType,
                entityId,
            });
        },
        enabled: !!workspace?.id,
    });

    const deleteCallMutation = useMutation({
        mutationFn: deleteCallService,
        onSuccess: () => {
            toast.success('Call deleted');
            setIsDeleteDialogOpen(false);
            setCallToDelete(null);
            queryClient.invalidateQueries({
                queryKey: ['calls', workspace?.id, entityType, entityId],
            });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete call');
            setIsDeleteDialogOpen(false);
            setCallToDelete(null);
        }
    });

    const handleDelete = (id: string) => {
        setCallToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const handleSuccess = async () => {
        setIsOpen(false);
        await queryClient.invalidateQueries({
            queryKey: ['calls', workspace?.id, entityType, entityId],
        });
    };

    const getCallStatusBadge = (status: string) => {
        const statusConfig = {
            completed: {
                variant: 'default' as const,
                className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                label: 'Connected',
            },
            no_answer: {
                variant: 'secondary' as const,
                className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                label: 'No Answer',
            },
            busy: {
                variant: 'secondary' as const,
                className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
                label: 'Busy',
            },
            left_voicemail: {
                variant: 'secondary' as const,
                className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                label: 'Left Voicemail',
            },
            missed: {
                variant: 'destructive' as const,
                className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                label: 'Missed',
            },
            failed: {
                variant: 'destructive' as const,
                className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                label: 'Failed',
            },
            voicemail: {
                variant: 'secondary' as const,
                className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                label: 'Voicemail',
            }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.completed;

        return (
            <Badge variant={config.variant} className={config.className}>
                {config.label}
            </Badge>
        );
    };


    return (
        <CardWidgetContainer
            title="Call Logs"
            headerClassName="p-2 xl:p-2 2xl:p-2"
            icon={<Phone className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
            icon2={
                <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-sm text-blue-500 hover:text-blue-600"
                    onClick={() => setIsOpen(true)}
                >
                    <Plus className="h-4 w-4" />
                    Log Call
                </Button>
            }
        >
            <div className="px-2 mb-2">
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : calls.length > 0 ? (
                    <CardWidgetList>
                        {calls.map((call: any) => (
                            <CardWidgetListItem
                                key={call.id}
                                icon={<Phone className="h-4 w-4 text-blue-600" />}
                                iconAlignTop={true}
                                title={call.call_type === 'inbound' ? 'Inbound Call' : 'Outbound Call'}
                                badge={getCallStatusBadge(call.status)}
                                actionStyle="slide"
                                content={
                                    <>
                                        {call.subject && (
                                            <p className="text-sm text-leadgaze-dark dark:text-white whitespace-pre-wrap">
                                                {call.subject}
                                            </p>
                                        )}
                                        {call.comments && (
                                            <p className="text-sm text-gray-500 whitespace-pre-wrap">
                                                {call.comments}
                                            </p>
                                        )}
                                    </>
                                }
                                metadata={
                                    <div className="flex flex-wrap gap-2">
                                        <span>{formatDate(call.date_time)}</span>
                                    </div>
                                }
                                actions={
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleDelete(call.id)}
                                        className="h-7 w-7 text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                }
                            />
                        ))}
                    </CardWidgetList>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF]">
                        <Phone className="h-6 w-6 text-blue-500" />
                      </div>
                      <p className="mt-4 text-sm text-gray-500">No call logs</p>
                    </div>
                )}
            </div>

            {workspace?.id && (
                <LogCallDialog
                    open={isOpen}
                    onOpenChange={setIsOpen}
                    onSuccess={handleSuccess}
                    entityType={entityType}
                    entityId={entityId}
                    workspaceId={workspace.id}
                />
            )}

            <CustomDeleteDialog
                isOpen={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                title="Delete Call Log"
                description="Are you sure you want to delete this call log? This action cannot be undone."
                onConfirm={() => {
                    if (callToDelete) {
                        deleteCallMutation.mutate(callToDelete);
                    }
                }}
                isDeleting={deleteCallMutation.isPending}
            />
        </CardWidgetContainer>
    );
}
