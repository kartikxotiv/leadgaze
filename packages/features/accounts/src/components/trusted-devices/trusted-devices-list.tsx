'use client';

import { useCallback, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Laptop, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';

export interface TrustedDevice {
  id: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  expires_at: string;
  last_used_at: string | null;
  created_at: string | null;
}

interface TrustedDevicesListProps {
  /** Server action to fetch trusted devices */
  fetchDevices: () => Promise<{
    success: boolean;
    data?: TrustedDevice[];
    error?: string;
  }>;
  /** Server action to delete a single device by ID */
  removeDevice: (
    deviceId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  /** Server action to delete all devices */
  removeAllDevices: () => Promise<{ success: boolean; error?: string }>;
  /** Optional callback invoked after all devices are removed. Use to sign out the current session. */
  onSignOut?: () => Promise<void>;
}

const QUERY_KEY = ['trusted-devices'];

export function TrustedDevicesList({
  fetchDevices,
  removeDevice,
  removeAllDevices,
  onSignOut,
}: TrustedDevicesListProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchDevices();
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
  });

  const removeMutation = useMutation({
    mutationFn: (deviceId: string) => removeDevice(deviceId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        toast.success(t('account:trustedDeviceRemoved'));
      } else {
        toast.error(result.error ?? t('account:trustedDeviceRemoveError'));
      }
      setDeletingId(null);
    },
    onError: () => {
      toast.error(t('account:trustedDeviceRemoveError'));
      setDeletingId(null);
    },
  });

  const removeAllMutation = useMutation({
    mutationFn: () => removeAllDevices(),
    onSuccess: async (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        toast.success(t('account:trustedDevicesAllRemoved'));

        // Sign out the current session after removing all trusted devices
        if (onSignOut) {
          await onSignOut();
        }
      } else {
        toast.error(result.error ?? t('account:trustedDeviceRemoveError'));
      }
      setConfirmRemoveAll(false);
    },
    onError: () => {
      toast.error(t('account:trustedDeviceRemoveError'));
      setConfirmRemoveAll(false);
    },
  });

  const handleRemove = useCallback(
    (deviceId: string) => {
      removeMutation.mutate(deviceId);
    },
    [removeMutation],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-sm">
        <Trans i18nKey="account:trustedDevicesLoadError" />
      </div>
    );
  }

  const devices = data ?? [];

  return (
    <div className="flex flex-col space-y-4">
      <If condition={devices.length === 0}>
        <div className="text-muted-foreground py-6 text-center text-sm">
          <Trans i18nKey="account:trustedDevicesEmpty" />
        </div>
      </If>

      <If condition={devices.length > 0}>
        <div className="flex flex-col space-y-3">
          {devices.map((device) => (
            <TrustedDeviceRow
              key={device.id}
              device={device}
              isDeleting={deletingId === device.id}
              onRemove={() => {
                setDeletingId(device.id);
                handleRemove(device.id);
              }}
            />
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmRemoveAll(true)}
            disabled={removeAllMutation.isPending}
          >
            {removeAllMutation.isPending ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            <Trans i18nKey="account:trustedDevicesRemoveAll" />
          </Button>
        </div>
      </If>

      {/* Confirm remove all dialog */}
      <AlertDialog open={confirmRemoveAll} onOpenChange={setConfirmRemoveAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans i18nKey="account:trustedDevicesRemoveAllTitle" />
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans i18nKey="account:trustedDevicesRemoveAllDescription" />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans i18nKey="common:cancel" />
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeAllMutation.mutate()}
              disabled={removeAllMutation.isPending}
            >
              <Trans i18nKey="account:trustedDevicesRemoveAllConfirm" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TrustedDeviceRow({
  device,
  isDeleting,
  onRemove,
}: {
  device: TrustedDevice;
  isDeleting: boolean;
  onRemove: () => void;
}) {
  const expiresAt = new Date(device.expires_at);
  const lastUsedAt = device.last_used_at ? new Date(device.last_used_at) : null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
          <Laptop className="text-muted-foreground h-5 w-5" />
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {device.device_name ?? 'Unknown Device'}
          </span>
          <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
            <If condition={!!device.ip_address}>
              <span>IP: {device.ip_address}</span>
            </If>
            <If condition={!!lastUsedAt}>
              <span>Last used: {formatDate(lastUsedAt!)}</span>
            </If>
            <span>Expires: {formatDate(expiresAt)}</span>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={isDeleting}
        className="text-muted-foreground hover:text-destructive"
      >
        {isDeleting ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <X className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
