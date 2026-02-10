'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, Phone, PhoneIncoming, PhoneOutgoing, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getCallsService, deleteCallService } from '~/services/calls.service';
import { LogCallDialog } from '../leads/components/log-call-dialog';

interface EntityCallsProps {
    entityType: string;
    entityId: string;
}

export function EntityCalls({ entityType, entityId }: EntityCallsProps) {
    const { currentWorkspace: workspace } = useRBAC();
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: calls = [], isLoading, refetch, isRefetching } = useQuery({
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

    const { mutate: deleteCall } = useMutation({
        mutationFn: deleteCallService,
        onSuccess: () => {
            toast.success('Call deleted');
            queryClient.invalidateQueries({
                queryKey: ['calls', workspace?.id, entityType, entityId],
            });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete call');
        }
    });

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this call log?')) {
            deleteCall(id);
        }
    };

    const handleSuccess = async () => {
        setIsOpen(false);
        await queryClient.invalidateQueries({
            queryKey: ['calls', workspace?.id, entityType, entityId],
        });
    };

    const getCallTypeIcon = (callType: string) => {
        return callType === 'inbound' ? (
            <PhoneIncoming className="h-4 w-4 text-green-600" />
        ) : (
            <PhoneOutgoing className="h-4 w-4 text-blue-600" />
        );
    };

    const getCallStatusBadge = (status: string) => {
        const statusConfig = {
            completed: {
                variant: 'default' as const,
                className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                label: 'Completed',
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
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            Call Logs
                            {isRefetching && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                        </CardTitle>
                    </div>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                        setIsOpen(true);
                    }}
                >
                    <Phone className="h-4 w-4" />
                    Log Call
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : calls.length > 0 ? (
                    <div className="space-y-3">
                        {calls.map((call: any) => (
                            <div
                                key={call.id}
                                className="group relative rounded-lg border border-transparent bg-gray-50 p-3 transition-colors hover:border-gray-200 dark:bg-slate-900"
                            >
                                <div className="">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                    {getCallTypeIcon(call.call_type)}
                                                    <span className="text-[10px] font-semibold uppercase text-gray-400">
                                                        {call.call_type}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 ">
                                                    {call.subject}
                                                </p>
                                            </div>
                                            <div className="flex mr-5 items-center">

                                                {getCallStatusBadge(call.status)}
                                            </div>

                                        </div>

                                        {/* Name & Duration - Removed duration as it's not in schema currently */}
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="text-gray-500">
                                                {call.contact_name ? (
                                                    <p>Contact: <span className="font-medium text-gray-700 dark:text-gray-300">{call.contact_name}</span></p>
                                                ) : (
                                                    <p className="italic">No Contact Name</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 font-medium text-gray-400">
                                                <span className="text-[10px]">{call.created_by_user?.name}</span>
                                            </div>
                                        </div>

                                        {/* Date & Time */}
                                        <div className="text-xs text-gray-500">
                                            <p>Date & Time: {new Date(call.date_time).toLocaleString()}</p>
                                        </div>

                                        {/* Notes/Comments */}
                                        {call.comments && (
                                            <div className="mt-1 rounded border border-gray-100 bg-white p-2 dark:border-gray-800 dark:bg-gray-800/50">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Comments:</p>
                                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                                    {call.comments}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            onClick={() => handleDelete(call.id)}
                                            className="p-1 text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 className=" h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center">
                        <Phone className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-500">No call logs</p>
                    </div>
                )}
            </CardContent>

            {workspace?.id && (
                <LogCallDialog
                    open={isOpen}
                    onOpenChange={setIsOpen}
                    onSuccess={() => {
                        handleSuccess();
                    }}
                    entityType={entityType}
                    entityId={entityId}
                    workspaceId={workspace.id}
                />
            )}
        </Card>
    );
}
