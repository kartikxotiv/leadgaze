import * as React from 'react';

import { cn } from '../lib/utils';
import { If } from './if';
import {
  PageDescription,
  PageHeader,
  PageLayoutProvider,
  type PageLayoutStyle,
  PageMobileNavigation,
  PageTitle,
} from './page-client';

export type { PageLayoutStyle };
export { PageMobileNavigation, PageHeader, PageTitle, PageDescription };

type PageProps = React.PropsWithChildren<{
  style?: PageLayoutStyle;
  contentContainerClassName?: string;
  className?: string;
  sticky?: boolean;
}>;

export function Page(props: PageProps) {
  const style = props.style ?? 'sidebar';

  return (
    <PageLayoutProvider style={style}>
      <PageContent {...props} style={style} />
    </PageLayoutProvider>
  );
}

function PageContent(props: PageProps) {
  switch (props.style) {
    case 'header':
      return <PageWithHeader {...props} />;

    case 'custom':
      return props.children;

    default:
      return <PageWithSidebar {...props} />;
  }
}

function PageWithSidebar(props: PageProps) {
  const { Navigation, Children, MobileNavigation } = getSlotsFromPage(props);

  return (
    <div className={cn('flex min-w-0 flex-1', props.className)}>
      {Navigation}

      <div
        className={
          props.contentContainerClassName ??
          'mx-auto flex h-screen w-full flex-col overflow-y-auto bg-inherit'
        }
      >
        {MobileNavigation}

        <div className={'bg-background flex flex-1 flex-col px-4 lg:px-0'}>
          {Children}
        </div>
      </div>
    </div>
  );
}

function PageWithHeader(props: PageProps) {
  const { Navigation, Children, MobileNavigation } = getSlotsFromPage(props);

  return (
    <div
      className={cn(
        'flex h-screen flex-1 flex-col overflow-y-auto',
        props.className,
      )}
    >
      <div
        className={
          props.contentContainerClassName ?? 'flex flex-1 flex-col space-y-4'
        }
      >
        <div
          className={cn(
            'bg-background/80 supports-[backdrop-filter]:bg-background/60 dark:border-border dark:shadow-primary/10 flex h-14 items-center justify-between border-b px-4 lg:justify-start lg:shadow-xs',
            {
              'sticky top-0 z-10 backdrop-blur-md': props.sticky ?? true,
            },
          )}
        >
          <div
            className={'hidden w-full flex-1 items-center space-x-8 lg:flex'}
          >
            {Navigation}
          </div>

          {MobileNavigation}
        </div>

        <div className={'container flex flex-1 flex-col'}>{Children}</div>
      </div>
    </div>
  );
}

export function PageBody(
  props: React.PropsWithChildren<{
    className?: string;
  }>,
) {
  const className = cn('flex w-full flex-1 flex-col lg:px-4', props.className);

  return <div className={className}>{props.children}</div>;
}

export function PageNavigation(props: React.PropsWithChildren) {
  return <div className={'flex-1 bg-inherit'}>{props.children}</div>;
}

export function PageHeaderActions(props: React.PropsWithChildren) {
  return <div className={'flex items-center space-x-2'}>{props.children}</div>;
}

function getSlotsFromPage(props: React.PropsWithChildren) {
  return React.Children.toArray(props.children).reduce<{
    Children: React.ReactNode[];
    Navigation: React.ReactElement | null;
    MobileNavigation: React.ReactElement | null;
  }>(
    (acc, child) => {
      if (!React.isValidElement(child)) {
        return acc;
      }

      if (child.type === PageNavigation) {
        return {
          ...acc,
          Navigation: child,
        };
      }

      if (child.type === PageMobileNavigation) {
        return {
          ...acc,
          MobileNavigation: child,
        };
      }

      return {
        ...acc,
        Children: [...acc.Children, child],
      };
    },
    {
      Children: [],
      Navigation: null,
      MobileNavigation: null,
    },
  );
}
