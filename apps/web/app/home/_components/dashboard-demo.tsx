'use client';

import dynamic from 'next/dynamic';

import { Card, CardContent, CardHeader } from '@kit/ui/card';
import { Skeleton } from '@kit/ui/skeleton';

function DashboardFallback() {
  return (
    <div className="flex flex-col pb-4 w-full relative">
      <div className="flex w-full gap-2 items-start">
        <div className="flex flex-col w-[calc(100%-300px)] xl:w-[calc(100%-320px)]">
          {/* 4 stat cards */}
          <div className="grid grid-cols-1 gap-2 pb-0 md:grid-cols-2 xl:grid-cols-4 xl:gap-2 xl:pb-0 2xl:grid-cols-4 2xl:gap-2 2xl:pb-0">
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

          {/* 6 widgets (2 columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => {
              const isSecondLayer = i === 3 || i === 4;
              const heightClass = isSecondLayer ? 'h-[200px]' : 'h-[320px]';
              
              return (
                <Card key={i} className={`${heightClass} flex flex-col overflow-hidden`}>
                  <CardHeader className="border-b p-2 xl:p-2 2xl:p-2 flex flex-row items-center justify-between space-y-0">
                    <Skeleton className="h-4 w-32" />
                    {i % 2 === 0 && <Skeleton className="h-4 w-4 rounded" />}
                  </CardHeader>
                  <div className="p-4 flex flex-col gap-4 flex-1">
                    {isSecondLayer ? (
                      <>
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </>
                    ) : (
                      <>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-32 w-full flex-1" />
                        <Skeleton className="h-4 w-3/4" />
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Widget Library Sidebar Skeleton */}
        <div className="shrink-0 sticky top-0 h-[calc(100vh-80px)] w-[300px] xl:w-[320px]">
          <div className="flex flex-col h-full bg-card border border-[#C3C6D6] overflow-hidden rounded-xl">
             <div className="flex flex-col p-3 border-b bg-card border-[#C3C6D6] sticky top-0 z-10 shrink-0">
               <Skeleton className="h-5 w-32" />
               <Skeleton className="h-2 w-20 mt-2" />
             </div>
             <div className="flex flex-col gap-4 p-3 flex-1 overflow-y-auto">
               <div className="flex flex-col gap-2">
                 <Skeleton className="h-3 w-16 mb-1" />
                 <Skeleton className="h-10 w-full rounded-lg" />
                 <Skeleton className="h-10 w-full rounded-lg" />
                 <Skeleton className="h-10 w-full rounded-lg" />
                 <Skeleton className="h-10 w-full rounded-lg" />
               </div>
               <div className="flex flex-col gap-2 mt-2">
                 <Skeleton className="h-3 w-16 mb-1" />
                 <Skeleton className="h-10 w-full rounded-lg" />
                 <Skeleton className="h-10 w-full rounded-lg" />
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const DashboardDemo = dynamic(
  () => import('./dashboard-demo-charts'),
  {
    ssr: false,
    loading: () => <DashboardFallback />,
  },
);
