/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  Page,
  PageLayoutStyle,
  PageMobileNavigation,
  PageNavigation,
} from '@kit/ui/page';
import { SidebarProvider } from '@kit/ui/shadcn-sidebar';

import { AppLogo } from '~/components/app-logo';
// home imports
import { RbacProvider } from '~/components/rbac/rbac-context';
import { navigationConfig } from '~/config/navigation.config';
import pathsConfig from '~/config/paths.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { getUserOrganizations } from '~/lib/server/organizations';
import { getRbacSnapshot } from '~/lib/server/rbac';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { HomeMenuNavigation } from './_components/home-menu-navigation';
import { HomeMobileNavigation } from './_components/home-mobile-navigation';
import { HomeSidebar } from './_components/home-sidebar';

async function HomeLayout({ children }: React.PropsWithChildren) {
  const [style, organizations, cookieStore, user] = await Promise.all([
    getLayoutStyle(),
    getUserOrganizations(),
    cookies(),
    requireUserInServerComponent(),
  ]);

  if (!organizations || organizations.length === 0) {
    redirect(pathsConfig.app.createOrganization);
  }

  const activeOrgId = cookieStore.get('organization_id')?.value;

  if (organizations.length > 1) {
    const hasValidActiveOrg = organizations.some((o) => o.id === activeOrgId);
    if (!hasValidActiveOrg) {
      redirect('/select-organization');
    }
  }

  const snapshot = activeOrgId
    ? await getRbacSnapshot({
        accountId: user.id,
        organizationId: activeOrgId,
      })
    : null;

  if (style === 'sidebar') {
    return (
      <RbacProvider initialSnapshot={snapshot}>
        <SidebarLayout user={user}>{children}</SidebarLayout>
      </RbacProvider>
    );
  }

  return (
    <RbacProvider initialSnapshot={snapshot}>
      <HeaderLayout>{children}</HeaderLayout>
    </RbacProvider>
  );
}

export default withI18n(HomeLayout);

function SidebarLayout({
  children,
  user,
}: React.PropsWithChildren<{ user: any }>) {
  const sidebarDefaultOpen = !navigationConfig.sidebarCollapsed;

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen}>
      <Page style={'sidebar'} className={'bg-sidebar'}>
        <PageNavigation>
          <HomeSidebar user={user} />
        </PageNavigation>

        <PageMobileNavigation className={'flex items-center justify-between'}>
          <MobileNavigation />
        </PageMobileNavigation>

        {children}
      </Page>
    </SidebarProvider>
  );
}

function HeaderLayout({ children }: React.PropsWithChildren) {
  return (
    <Page style={'header'}>
      <PageNavigation>
        <HomeMenuNavigation />
      </PageNavigation>

      <PageMobileNavigation className={'flex items-center justify-between'}>
        <MobileNavigation />
      </PageMobileNavigation>

      {children}
    </Page>
  );
}

function MobileNavigation() {
  return (
    <>
      <AppLogo />

      <HomeMobileNavigation />
    </>
  );
}

async function getLayoutStyle() {
  const cookieStore = await cookies();

  return (
    (cookieStore.get('layout-style')?.value as PageLayoutStyle) ??
    navigationConfig.style
  );
}
