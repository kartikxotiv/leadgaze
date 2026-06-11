'use client';

import dynamic from 'next/dynamic';

import { Card, CardContent, CardHeader } from '@kit/ui/card';
import { Skeleton } from '@kit/ui/skeleton';

function DashboardFallback() {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="grid grid-cols-1 gap-4 pb-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-3 xl:pb-4 2xl:grid-cols-4 2xl:gap-4 2xl:pb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-32 xl:h-28 2xl:h-32 flex flex-col justify-between">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </CardHeader>
            <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:gap-4 2xl:gap-8">
        <Card><div className="h-64 p-6 space-y-6">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-4 w-full rounded-full" />)}</div></Card>
        <Card><div className="h-64 p-6 space-y-6">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div></Card>
      </div>
    </div>
  );
}

export const DashboardDemo = dynamic(() => import('./dashboard-demo-charts'), {
  ssr: false,
  loading: () => <DashboardFallback />,
});
