'use client';

import type React from 'react';

import { usePathname } from 'next/navigation';

import { PageHeader } from '@kit/ui/page';

const routeHeaders = [
  {
    segment: '/investors',
    title: 'Investors',
    description: 'Manage investor organizations and contacts.',
  },
  {
    segment: '/rounds',
    title: 'Funding Rounds',
    description: 'Manage all fundraising rounds.',
  },
  {
    segment: '/deals',
    title: 'Deals',
    description: 'Track investor conversations and commitments.',
  },
  {
    segment: '/pipeline',
    title: 'Pipeline',
    description: 'Track investor progress through fundraising stages.',
  },
  {
    segment: '/activities',
    title: 'Activities',
    description: 'Review fundraising activity across investors, rounds, and deals.',
  },
  {
    segment: '/settings',
    title: 'Settings',
    description: 'Manage fundraising pipeline and static configuration.',
  },
];

export default function FundsLayout({ children }: React.PropsWithChildren) {
  const pathname = usePathname();
  const header =
    routeHeaders.find((item) => pathname.includes(item.segment)) ??
    {
      title: 'Funds',
      description: 'Quick view of rounds, investors, and pipeline health.',
    };

  return (
    <>
      <PageHeader title={header.title} description={header.description} />
      {children}
    </>
  );
}
