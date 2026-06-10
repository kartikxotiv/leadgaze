'use client';

import type React from 'react';

import { usePathname } from 'next/navigation';

import { PageHeader } from '@kit/ui/page';

import { ModuleAccessGuardWrapper } from '../_components/module-access-guard-wrapper';

const routeHeaders = [
  {
    segment: '/tickets',
    title: 'Tickets',
    description: 'Create, assign, and resolve customer support requests.',
  },
  {
    segment: '/customers',
    title: 'Customers',
    description: 'Manage support customers and organizations.',
  },
  {
    segment: '/inboxes',
    title: 'Support Inboxes',
    description:
      'View and reply to support email conversations powered by Core Email.',
  },
  {
    segment: '/teams',
    title: 'Support Teams',
    description: 'Manage support teams and ownership.',
  },
  {
    segment: '/reports',
    title: 'Reports',
    description: 'Analyze support volume, workload, and logged time.',
  },
  {
    segment: '/settings',
    title: 'Service Settings',
    description: 'Configure statuses, priorities, and categories.',
  },
];

const routesWithOwnHeader = [
  '/profile-settings',
  '/workspace-settings',
  '/audit-logs',
  '/team-members',
  '/workspace-teams',
  '/roles',
];

export default function ServiceCloudLayout({
  children,
}: React.PropsWithChildren) {
  const pathname = usePathname();

  if (routesWithOwnHeader.some((segment) => pathname.includes(segment))) {
    return (
      <ModuleAccessGuardWrapper moduleKey="service_cloud">
        {children}
      </ModuleAccessGuardWrapper>
    );
  }

  const header = routeHeaders.find((item) =>
    pathname.includes(item.segment),
  ) ?? {
    title: 'Service Cloud',
    description:
      'Support operations, tickets, customers, inboxes, and performance.',
  };

  return (
    <ModuleAccessGuardWrapper moduleKey="service_cloud">
      <PageHeader        
        title={header.title}
        description={header.description}
      />
      {children}
    </ModuleAccessGuardWrapper>
  );
}
