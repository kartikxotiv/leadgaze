'use client';

import type { JwtPayload } from '@supabase/supabase-js';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@kit/ui/shadcn-sidebar';
import { cn } from '@kit/ui/utils';

import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';
import { Tables } from '~/lib/database.types';

import { HomeSidebarClient } from './home-sidebar-client';

export function HomeSidebar(props: {
  account?: Tables<'accounts'>;
  user: JwtPayload;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible={'icon'}>
      <SidebarHeader className={'h-16 justify-center'}>
        <div
          className={cn('flex items-center space-x-2', {
            'justify-center px-0': isCollapsed,
            'justify-between px-2': !isCollapsed,
          })}
        >
          <div>
            <AppLogo collapsed={isCollapsed} className={'max-w-full'} />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <HomeSidebarClient user={props.user} />
      </SidebarContent>

      <SidebarFooter>
        <ProfileAccountDropdownContainer
          user={props.user}
          account={props.account}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
