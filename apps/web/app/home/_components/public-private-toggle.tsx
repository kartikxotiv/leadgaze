'use client';

import React, { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Globe } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Switch } from '@kit/ui/switch';
import { Label } from '@kit/ui/label';
import { Card, CardContent } from '@kit/ui/card';

import { useUser } from '@kit/supabase/hooks/use-user';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useQuery } from '@tanstack/react-query';
import ApiClient from '~/utils/axios-client';

interface PublicPrivateToggleProps {
    entityType: 'lead' | 'account' | 'contact' | 'opportunity';
    entityId: string;
    isPublic: boolean;
    createdBy: string;
    workspaceId: string;
}

export function PublicPrivateToggle({
    entityType,
    entityId,
    isPublic,
    createdBy,
    workspaceId,
}: PublicPrivateToggleProps) {
    const { data: user } = useUser();
    const { currentWorkspace } = useRBAC();
    const queryClient = useQueryClient();
    const [isUpdating, setIsUpdating] = useState(false);

    // Fetch workspace to check owner
    const { data: workspaceData } = useQuery({
        queryKey: ['workspace', workspaceId],
        queryFn: async () => {
            const supabase = getSupabaseBrowserClient();
            const { data, error } = await supabase
                .from('workspaces')
                .select('owner_id')
                .eq('id', workspaceId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!workspaceId,
    });

    // Check if user can edit: workspace owner or creator
    const isWorkspaceOwner = workspaceData?.owner_id === user?.id;
    const isCreator = createdBy === user?.id;
    const canEdit = isWorkspaceOwner || isCreator;

    const updateMutation = useMutation({
        mutationFn: async (newIsPublic: boolean) => {
            const endpoint = `/${entityType}s/${entityId}`;
            const response = await ApiClient.patch(endpoint, {
                is_public: newIsPublic,
            });
            return response.data;
        },
        onSuccess: () => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: [entityType, entityId] });
            queryClient.invalidateQueries({ queryKey: [`${entityType}s`, workspaceId] });
            toast.success(`Visibility updated to ${isPublic ? 'private' : 'public'}`);
        },
        onError: (error: any) => {
            const message =
                error?.response?.data?.message || 'Failed to update visibility';
            toast.error(message);
        },
        onSettled: () => {
            setIsUpdating(false);
        },
    });

    const handleToggle = async (checked: boolean) => {
        if (!canEdit) {
            toast.error('Only workspace owner or creator can change visibility');
            return;
        }

        setIsUpdating(true);
        updateMutation.mutate(checked);
    };

    if (!canEdit) return null;

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isPublic ? (
                            <Globe className="h-5 w-5 text-muted-foreground" />
                        ) : (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                            <Label
                                htmlFor="public-toggle"
                                className="text-sm font-medium cursor-pointer"
                            >
                                Visibility
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {isPublic
                                    ? 'Visible to all team members'
                                    : 'Visible only to you and assigned members'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge
                            variant={isPublic ? 'default' : 'secondary'}
                            className="hidden sm:inline-flex"
                        >
                            {isPublic ? 'Public' : 'Private'}
                        </Badge>
                        <Switch
                            id="public-toggle"
                            checked={isPublic}
                            onCheckedChange={handleToggle}
                            disabled={!canEdit || isUpdating}
                            aria-label="Toggle public/private visibility"
                        />
                    </div>
                </div>
                {!canEdit && (
                    <p className="text-xs text-muted-foreground mt-2">
                        Only workspace owner or creator can change visibility
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
