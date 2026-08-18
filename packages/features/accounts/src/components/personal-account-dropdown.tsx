'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import type { JwtPayload } from '@supabase/supabase-js';

import { ChevronsUpDown, Home, LogOut, UserPen } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { If } from '@kit/ui/if';
import { SubMenuModeToggle } from '@kit/ui/mode-toggle';
import { ProfileAvatar } from '@kit/ui/profile-avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { usePersonalAccountData } from '../hooks/use-personal-account-data';

export function PersonalAccountDropdown({
  className,
  user,
  signOutRequested,
  showProfileName = true,
  paths,
  features,
  account,
  appVersion,
}: {
  user: JwtPayload;

  account?: {
    id: string | null;
    name: string | null;
    picture_url: string | null;
    color?: string | null;
  };

  signOutRequested: () => unknown;

  paths: {
    home: string;
    profile?: string;
  };

  features: {
    enableThemeToggle: boolean;
  };

  showProfileName?: boolean;

  className?: string;

  appVersion?: {
    name?: string;
    version?: string;
    build?: string;
  };
}) {
  const personalAccountData = usePersonalAccountData(user.id, account);

  const appName =
    appVersion?.name ?? 'Leadgaze';
  const appVersionNumber =
    appVersion?.version ?? '2.1.0';
  const signedInAsLabel = useMemo(() => {
    const email = user?.email ?? undefined;
    const phone = user?.phone ?? undefined;

    return email ?? phone;
  }, [user]);

  const displayName =
    personalAccountData?.data?.name ?? account?.name ?? user?.email ?? '';

  const userColor =
    personalAccountData?.data?.color ||
    account?.color ||
    '#ffffff';

  const selectedModule =
    typeof window !== 'undefined'
      ? localStorage.getItem('selected_module')
      : null;

  const profilePath =
    selectedModule === 'hrms'
      ? '/home/hrms/profile-settings'
      : selectedModule === 'sales'
        ? '/home/sales/profile-settings'
        : '/home/services/profile-settings';

  return (
    <TooltipProvider>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger
              aria-label="Open your profile menu"
              data-test={'account-dropdown-trigger'}
              className={cn(
                'animate-in fade-in focus:outline-primary flex cursor-pointer items-center rounded-full duration-500 group-data-[minimized=true]:px-0',
                className ?? '',
                {
                  ['active:bg-secondary/50 items-center gap-x-4 rounded-full' +
                    ' hover:bg-primary p-2 transition-colors']: showProfileName,
                },
              )}
            >
              <div
                className="inline-flex items-center justify-center rounded-full p-[1px] border-1 shadow-sm transition-all"
                style={{
                  borderColor: userColor,
                  // boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.35)',
                }}
              >
                <ProfileAvatar
                  className={'rounded-full h-8 w-8'}
                  fallbackClassName={
                    'rounded-full border border-header-primary bg-header-primary text-primary-foreground dark:border-white dark:text-white'
                  }
                  displayName={displayName ?? user?.email ?? ''}
                  pictureUrl={personalAccountData?.data?.picture_url}
                />
              </div>

              <If condition={showProfileName}>
                <div
                  className={
                    'fade-in animate-in flex w-full flex-col truncate text-left group-data-[minimized=true]:hidden'
                  }
                >
                  <span
                    data-test={'account-dropdown-display-name'}
                    className={'truncate text-sm'}
                  >
                    {displayName}
                  </span>

                  <span
                    data-test={'account-dropdown-email'}
                    className={'text-muted-foreground truncate text-xs'}
                  >
                    {signedInAsLabel}
                  </span>
                </div>

                <ChevronsUpDown
                  className={
                    'text-muted-foreground mr-1 h-8 group-data-[minimized=true]:hidden'
                  }
                />
              </If>
            </DropdownMenuTrigger>
          </TooltipTrigger>

          <TooltipContent
            side="bottom"
            align="end"
            className="text-xs font-medium shadow-md px-2.5 py-1"
          >
            {displayName || user?.email}
          </TooltipContent>

          <DropdownMenuContent className={'xl:!min-w-[15rem]'}>
            <DropdownMenuItem className={'!h-10 rounded-none'}>
              <div
                className={'flex flex-col justify-start truncate text-left text-xs'}
              >
                <div className={'text-muted-foreground'}>
                  <Trans i18nKey={'common:signedInAs'} />
                </div>

                <div>
                  <span className={'block truncate'}>{signedInAsLabel}</span>
                </div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link
                className={'s-full flex cursor-pointer items-center space-x-2'}
                href={paths.home}
              >
                <Home className={'h-5'} />

                <span>
                  <Trans i18nKey={'common:routes.home'} />
                </span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {selectedModule ? (
              <>
                <DropdownMenuItem asChild>
                  <Link
                    className={'s-full flex cursor-pointer items-center space-x-2'}
                    href={profilePath}
                  >
                    <UserPen className={'h-5'} />

                    <span>
                      <Trans i18nKey={'common:routes.profile'} />
                    </span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
              </>
            ) : null}

            <If condition={features.enableThemeToggle}>
              <SubMenuModeToggle />
            </If>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              data-test={'account-dropdown-sign-out'}
              role={'button'}
              className={'cursor-pointer'}
              onClick={signOutRequested}
            >
              <span className={'flex w-full items-center space-x-2'}>
                <LogOut className={'h-5'} />

                <span>
                  <Trans i18nKey={'auth:signOut'} />
                </span>
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <div className={'flex justify-center px-2 gap-1 text-left select-none'}>
              <span className={'text-[11px] text-muted-foreground'}>
                {appName}
              </span>
              <span className={'text-[11px] text-muted-foreground'}>
                v{appVersionNumber.replace(/^v/, '')}
              </span>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>
    </TooltipProvider>
  );
}
