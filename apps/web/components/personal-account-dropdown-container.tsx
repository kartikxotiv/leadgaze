'use client';

import { usePathname } from 'next/navigation';

import type { JwtPayload } from '@supabase/supabase-js';

import { PersonalAccountDropdown } from '@kit/accounts/personal-account-dropdown';
import { useSignOut } from '@kit/supabase/hooks/use-sign-out';
import { useUser } from '@kit/supabase/hooks/use-user';

import featuresFlagConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';

import { useRBAC } from '~/lib/rbac/rbac-provider';

const paths = {
  home: pathsConfig.app.home,
};

const features = {
  enableThemeToggle: featuresFlagConfig.enableThemeToggle,
};

export function ProfileAccountDropdownContainer(props: {
  user?: JwtPayload;
  showProfileName?: boolean;

  account?: {
    id: string | null;
    name: string | null;
    picture_url: string | null;
    color?: string | null;
  };
}) {
  const signOut = useSignOut();
  const user = useUser(props.user);
  const { currentWorkspace } = useRBAC();
  const userData = user.data;
  const pathname = usePathname() || '';
  const profilePath = getProfileSettingsPath(pathname);

  if (!userData) {
    return null;
  }

  const roleColor = currentWorkspace?.currentRole?.color || null;
  const mergedAccount = {
    id: props.account?.id ?? null,
    name: props.account?.name ?? null,
    picture_url: props.account?.picture_url ?? null,
    color: props.account?.color || roleColor,
  };

  return (
    <PersonalAccountDropdown
      className={'w-full'}
      paths={{ ...paths, profile: profilePath }}
      features={features}
      user={userData}
      account={mergedAccount}
      signOutRequested={() => signOut.mutateAsync()}
      showProfileName={props.showProfileName}
    />
  );
}

function getProfileSettingsPath(pathname: string) {
  if (pathname.startsWith('/home/services')) {
    return '/home/services/profile-settings';
  }

  if (pathname.startsWith('/home/hrms')) {
    return '/home/hrms/profile-settings';
  }

  if (pathname.startsWith('/home/inventory')) {
    return '/home/inventory/profile-settings';
  }

  if (pathname.startsWith('/home/fund')) {
    return '/home/funds/profile-settings';
  }

  return pathsConfig.app.profileSettings;
}
