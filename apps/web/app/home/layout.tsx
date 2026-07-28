import { Suspense, use } from 'react';

import { AppShell } from '@kit/ui/app-shell';
import type { PageLayoutStyle } from '@kit/ui/page';

import { AppLogo } from '~/components/app-logo';
import { navigationConfig } from '~/config/navigation.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { WelcomeModal } from './_components/welcome-modal';

// home imports
import { HomeMenuNavigation } from './_components/home-menu-navigation';
import { HomeMobileNavigation } from './_components/home-mobile-navigation';
import { HomeSidebar } from './_components/home-sidebar';

function HomeLayout({ children }: React.PropsWithChildren) {
  const style = use(getLayoutStyle());

  return (
    <>
      <Suspense fallback={null}>
        <WelcomeModal />
      </Suspense>
      {style === 'sidebar' ? (
        <SidebarLayout>{children}</SidebarLayout>
      ) : (
        <HeaderLayout>{children}</HeaderLayout>
      )}
    </>
  );
}

export default withI18n(HomeLayout);

function SidebarLayout({ children }: React.PropsWithChildren) {
  const sidebarMinimized = navigationConfig.sidebarCollapsed;
  const [user] = use(Promise.all([requireUserInServerComponent()]));

  return (
    <AppShell
      style="sidebar"
      sidebarMinimized={sidebarMinimized}
      sidebar={<HomeSidebar user={user} />}
      mobileNavigation={<MobileNavigation />}
    >
      {children}
    </AppShell>
  );
}

function HeaderLayout({ children }: React.PropsWithChildren) {
  return (
    <AppShell
      style="header"
      navbar={<HomeMenuNavigation />}
      mobileNavigation={<MobileNavigation />}
    >
      {children}
    </AppShell>
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
