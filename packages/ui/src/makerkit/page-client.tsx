'use client';

import * as React from 'react';

import { cn } from '../lib/utils';
import { Separator } from '../shadcn/separator';
import { SidebarTrigger } from '../shadcn/sidebar';
import { If } from './if';

export type PageLayoutStyle = 'sidebar' | 'header' | 'custom';

const PageLayoutContext = React.createContext<{
  style: PageLayoutStyle;
}>({
  style: 'sidebar',
});

const ENABLE_SIDEBAR_TRIGGER = process.env.NEXT_PUBLIC_ENABLE_SIDEBAR_TRIGGER
  ? process.env.NEXT_PUBLIC_ENABLE_SIDEBAR_TRIGGER === 'true'
  : true;

export function PageLayoutProvider({
  children,
  style,
}: React.PropsWithChildren<{ style: PageLayoutStyle }>) {
  return (
    <PageLayoutContext.Provider value={{ style }}>
      {children}
    </PageLayoutContext.Provider>
  );
}

export function usePageLayout() {
  return React.useContext(PageLayoutContext);
}

export function PageMobileNavigation(
  props: React.PropsWithChildren<{
    className?: string;
  }>,
) {
  return (
    <div
      className={cn(
        'bg-background sticky top-0 z-20 flex w-full items-center border-b px-4 py-2 lg:hidden lg:px-0',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

export function PageDescription(props: React.PropsWithChildren) {
  return (
    <div className={'flex h-6 items-center'}>
      <div className={'text-muted-foreground text-xs leading-none font-normal'}>
        {props.children}
      </div>
    </div>
  );
}

export function PageTitle(props: React.PropsWithChildren) {
  return (
    <h1
      className={
        'font-heading text-base leading-none font-bold tracking-tight dark:text-white'
      }
    >
      {props.children}
    </h1>
  );
}

export function PageHeader({
  children,
  title,
  description,
  className,
  displaySidebarTrigger = ENABLE_SIDEBAR_TRIGGER,
}: React.PropsWithChildren<{
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  displaySidebarTrigger?: boolean;
}>) {
  const { style } = usePageLayout();
  const isHeaderLayout = style === 'header';

  return (
    <div
      className={cn(
        'bg-background/95 sticky z-10 flex items-center justify-between py-5 backdrop-blur-md px-6',
        {
          'top-0': !isHeaderLayout,
          'top-14 border-b': isHeaderLayout,
        },
        className,
      )}
    >
      <div className={'flex flex-col gap-y-2'}>
        <div className="flex items-center gap-x-2.5">
          {displaySidebarTrigger ? (
            <SidebarTrigger className="text-muted-foreground hover:text-secondary-foreground hidden h-4.5 w-4.5 cursor-pointer lg:inline-flex" />
          ) : null}

          <If condition={title}>
            <If condition={displaySidebarTrigger}>
              <Separator
                orientation="vertical"
                className="hidden h-4 w-px lg:group-data-[minimized]:block"
              />
            </If>

            <PageTitle>{title}</PageTitle>
          </If>
        </div>

        <If condition={description}>
          <PageDescription>{description}</PageDescription>
        </If>
      </div>

      {children}
    </div>
  );
}
