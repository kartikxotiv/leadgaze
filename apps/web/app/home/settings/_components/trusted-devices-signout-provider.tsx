'use client';

import { useCallback } from 'react';

import { PersonalAccountSettingsContainer } from '@kit/accounts/personal-account-settings';
import { useSignOut } from '@kit/supabase/hooks/use-sign-out';

import type { TrustedDevicesActions } from '@kit/accounts/personal-account-settings';

export function TrustedDevicesSignOutProvider({
  userId,
  paths,
  features,
  trustedDevices,
}: {
  userId: string;
  paths: { callback: string };
  features: { enableAccountDeletion: boolean; enablePasswordUpdate: boolean };
  trustedDevices: Omit<TrustedDevicesActions, 'onSignOut'>;
}) {
  const signOut = useSignOut();

  const onSignOut = useCallback(async () => {
    await signOut.mutateAsync();
    window.location.replace('/auth/sign-in');
  }, [signOut]);

  return (
    <PersonalAccountSettingsContainer
      userId={userId}
      paths={paths}
      features={features}
      trustedDevices={{
        ...trustedDevices,
        onSignOut,
      }}
    />
  );
}
