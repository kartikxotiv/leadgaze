'use client';

import { Sparkles, Zap } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Page, PageMobileNavigation, PageNavigation } from '@kit/ui/page';

import { AppLogo } from '~/components/app-logo';
import { useRBAC } from '~/lib/rbac/rbac-provider';

import { HomeMenuNavigation } from '../home/_components/home-menu-navigation';
import { HomeMobileNavigation } from '../home/_components/home-mobile-navigation';

function OrgLayout({ children }: React.PropsWithChildren) {
  const { currentWorkspace } = useRBAC();

  return (
    <Page style={'header'}>
      <PageNavigation>
        <HomeMenuNavigation />
      </PageNavigation>

      <PageMobileNavigation className={'flex items-center justify-between'}>
        <AppLogo />
        <HomeMobileNavigation />
      </PageMobileNavigation>

      <div className="border-border from-primary/[0.03] border-b bg-gradient-to-b to-transparent">
        <div className="mx-auto py-2">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="text-primary h-4 w-4" />
                <span className="secondary-text-small text-primary font-medium tracking-widest uppercase">
                  Workspace
                </span>
              </div>
              <h1 className="primary-heading-number text-leadgaze-dark dark:text-white tracking-tight">
                {currentWorkspace?.name ?? 'Your Workspace'}
              </h1>
              <p className="primary-text-regular text-muted-foreground">
                Select a module to continue. Your access is based on your
                subscription plan.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Badge variant="success" className="gap-1.5">
                <Zap className="h-3 w-3" />
                All systems operational
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {children}
    </Page>
  );
}

export default OrgLayout;
