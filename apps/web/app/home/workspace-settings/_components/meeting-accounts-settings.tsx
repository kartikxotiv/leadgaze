'use client';

import { useState } from 'react';

import Image from 'next/image';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  type IntegrationAccount,
  deleteIntegrationAccountService,
  getIntegrationAccountsService,
} from '@kit/core/services';
import { useUser } from '@kit/supabase/hooks/use-user';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Skeleton } from '@kit/ui/skeleton';

// =============================================================================
// TYPES
// =============================================================================

type ProviderConfig = {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  authPath: string;
  color: string;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'GOOGLE',
    name: 'Google Meet',
    // icon: <GoogleMeetIcon className="h-8 w-8" />,
    icon: (
      <Image
        src={'/images/icons/google-meet.png'}
        width={32}
        height={32}
        className="h-8 w-8"
        alt="Google Meet"
      />
    ),
    description:
      'Connect Google Workspace to schedule meetings via Google Meet and sync with Google Calendar.',
    authPath: '/api/core/integrations/google/auth',
    color: '#4285F4',
  },
  {
    id: 'ZOOM',
    name: 'Zoom',
    // icon: <ZoomIcon className="h-8 w-8" />,
    icon: (
      <Image
        src={'/images/icons/zoom.webp'}
        width={32}
        height={32}
        className="h-8 w-8"
        alt="Google Meet"
      />
    ),
    description:
      'Connect Zoom to schedule video meetings using your Zoom account.',
    authPath: '/api/core/integrations/zoom/auth',
    color: '#2D8CFF',
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

interface MeetingAccountsSettingsProps {
  workspace: { id: string; name?: string } | null;
}

export function MeetingAccountsSettings({
  workspace,
}: MeetingAccountsSettingsProps) {
  useUser();
  const queryClient = useQueryClient();
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderConfig | null>(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ['meeting-accounts', workspace?.id],
    queryFn: () => getIntegrationAccountsService(workspace!.id),
    enabled: Boolean(workspace?.id),
  });

  const deleteMutation = useMutation({
    mutationFn: (accountId: string) =>
      deleteIntegrationAccountService(workspace!.id, accountId),
    onSuccess: () => {
      toast.success('Meeting account disconnected');
      queryClient.invalidateQueries({
        queryKey: ['meeting-accounts', workspace?.id],
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Failed to disconnect account',
      );
    },
  });

  const handleConnect = (provider: ProviderConfig) => {
    if (!workspace?.id) return;
    const params = new URLSearchParams({
      workspace_id: workspace.id,
      return_url: '/home/workspace-settings',
    });
    window.location.href = `${provider.authPath}?${params.toString()}`;
  };

  const handleOpenConnect = (provider: ProviderConfig) => {
    setSelectedProvider(provider);
    setConnectDialogOpen(true);
  };

  // Group accounts by provider
  const accountsByProvider = PROVIDERS.reduce(
    (acc, provider) => {
      acc[provider.id] = accounts.filter(
        (a: IntegrationAccount) => a.connection?.provider === provider.id,
      );
      return acc;
    },
    {} as Record<string, IntegrationAccount[]>,
  );

  return (
    <div className="space-y-6">
      {/* Provider Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const providerAccounts = accountsByProvider[provider.id] ?? [];

          return (
            <Card key={provider.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${provider.color}15` }}
                  >
                    {provider.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      {provider.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Connected Accounts */}
                {providerAccounts.length > 0 ? (
                  <div className="space-y-2">
                    {providerAccounts.map((account) => (
                      <AccountRow
                        key={account.id}
                        account={account}
                        onDelete={() => deleteMutation.mutate(account.id)}
                        isDeleting={deleteMutation.isPending}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-muted-foreground text-sm">
                      No accounts connected
                    </p>
                  </div>
                )}

                {/* Connect Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOpenConnect(provider)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add {provider.name} Account
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {selectedProvider?.name}</DialogTitle>
            <DialogDescription>
              You will be redirected to authenticate your{' '}
              {selectedProvider?.name} account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${selectedProvider?.color}15` }}
              >
                {selectedProvider?.icon}
              </div>
              <div>
                <h4 className="font-medium">{selectedProvider?.name}</h4>
                <p className="text-muted-foreground text-sm">
                  Click continue to authorize access to your{' '}
                  {selectedProvider?.name} account.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConnectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => handleConnect(selectedProvider!)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// ACCOUNT ROW COMPONENT
// =============================================================================

function AccountRow({
  account,
  onDelete,
  isDeleting,
}: {
  account: IntegrationAccount;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-gray-50/50 p-3 dark:bg-gray-900/50">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          {account.connection?.provider === 'GOOGLE' ? (
            // <GoogleMeetIcon className="h-5 w-5" />
            <Image
              src={'/images/icons/google-meet.png'}
              width={32}
              height={32}
              className="h-5 w-5"
              alt="Google Meet"
            />
          ) : (
            // <ZoomIcon className="h-5 w-5" />
            <Image
              src={'/images/icons/zoom.webp'}
              width={32}
              height={32}
              className="h-5 w-5"
              alt="Google Meet"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {account.email || account.display_name || 'Unknown account'}
          </p>
          <div className="flex items-center gap-2">
            <Badge
              variant={account.status === 'active' ? 'default' : 'secondary'}
              className="h-5 text-xs"
            >
              {account.status}
            </Badge>
            {account.access_scope === 'workspace' && (
              <Badge variant="outline" className="h-5 text-xs">
                Workspace
              </Badge>
            )}
          </div>
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="text-muted-foreground h-4 w-4" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect{' '}
              <strong>{account.email || account.display_name}</strong>? This
              will remove access to this account for scheduling meetings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

export function MeetingAccountsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-10 rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
