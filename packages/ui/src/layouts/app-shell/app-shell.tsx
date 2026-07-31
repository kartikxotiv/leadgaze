'use client';

import type { ReactNode } from 'react';

import {
  Page,
  PageMobileNavigation,
  PageNavigation,
  type PageLayoutStyle,
} from '../../makerkit/page';
import { SidebarProvider } from '../../shadcn/sidebar';
import { TooltipProvider } from '../../shadcn/tooltip';
import { cn } from '../../lib/utils';

export interface AppShellProps {
  children: ReactNode;
  style?: PageLayoutStyle;
  navbar?: ReactNode;
  sidebar?: ReactNode;
  mobileNavigation?: ReactNode;
  sidebarMinimized?: boolean;
  contentClassName?: string;
  className?: string;
}

export function AppShell({
  children,
  style = 'header',
  navbar,
  sidebar,
  mobileNavigation,
  sidebarMinimized = false,
  contentClassName,
  className,
}: AppShellProps) {
  return (
    <TooltipProvider>
      {style === 'sidebar' ? (
        <SidebarProvider defaultOpen={sidebarMinimized}>
          <Page
            style="sidebar"
            className={className}
            contentContainerClassName={cn(
              'mx-auto flex h-screen w-full min-w-0 flex-col overflow-auto bg-inherit',
              contentClassName,
            )}
          >
            {sidebar && <PageNavigation>{sidebar}</PageNavigation>}
            {mobileNavigation && (
              <PageMobileNavigation className="flex items-center justify-between">
                {mobileNavigation}
              </PageMobileNavigation>
            )}
            {children}
          </Page>
        </SidebarProvider>
      ) : (
        <Page style="header" className={className}>
          {navbar && <PageNavigation>{navbar}</PageNavigation>}
          {mobileNavigation && (
            <PageMobileNavigation className="flex items-center justify-between">
              {mobileNavigation}
            </PageMobileNavigation>
          )}
          {children}
        </Page>
      )}
    </TooltipProvider>
  );
}
