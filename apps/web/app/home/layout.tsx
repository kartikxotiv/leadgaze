import { Suspense, use } from 'react';

import { cookies } from 'next/headers';

import {
  Page,
  PageLayoutStyle,
  PageMobileNavigation,
  PageNavigation,
} from '@kit/ui/page';
import { SidebarProvider } from '@kit/ui/shadcn-sidebar';

import { AppLogo } from '~/components/app-logo';
import { navigationConfig } from '~/config/navigation.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { TooltipProvider } from '@kit/ui/tooltip';

import { WelcomeModal } from './_components/welcome-modal';

// home imports
import { HomeMenuNavigation } from './_components/home-menu-navigation';
import { HomeMobileNavigation } from './_components/home-mobile-navigation';
import { HomeSidebar } from './_components/home-sidebar';

function HomeLayout({ children }: React.PropsWithChildren) {
  const style = use(getLayoutStyle());

  return (
    <TooltipProvider>
      <Suspense fallback={null}>
        <WelcomeModal />
      </Suspense>
      {style === 'sidebar' ? (
        <SidebarLayout>{children}</SidebarLayout>
      ) : (
        <HeaderLayout>{children}</HeaderLayout>
      )}
    </TooltipProvider>
  );
}

export default withI18n(HomeLayout);

function SidebarLayout({ children }: React.PropsWithChildren) {
  const sidebarMinimized = navigationConfig.sidebarCollapsed;
  const [user] = use(Promise.all([requireUserInServerComponent()]));

  return (
    <SidebarProvider defaultOpen={sidebarMinimized}>
      <Page
        style={'sidebar'}
        contentContainerClassName="mx-auto flex h-screen w-full min-w-0 flex-col overflow-auto bg-inherit"
      >
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
  return 'header' as PageLayoutStyle;
}
