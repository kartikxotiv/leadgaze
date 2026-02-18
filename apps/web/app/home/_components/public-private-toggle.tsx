'use client';

import React, { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Card, CardContent } from '@kit/ui/card';
import { Label } from '@kit/ui/label';
import { Switch } from '@kit/ui/switch';

import { useRBAC } from '~/lib/rbac/rbac-provider';
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
      queryClient.invalidateQueries({
        queryKey: [`${entityType}s`, workspaceId],
      });
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

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPublic ? (
              <Globe className="text-muted-foreground h-5 w-5" />
            ) : (
              <Lock className="text-muted-foreground h-5 w-5" />
            )}
            <div>
              <Label
                htmlFor="public-toggle"
                className="cursor-pointer text-sm font-medium"
              >
                Visibility
              </Label>
              <p className="text-muted-foreground mt-0.5 text-xs">
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
          <div className="mt-3 rounded-md border border-amber-100 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Only workspace owner or creator can change visibility
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
