"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  showHeader?: boolean;
  showCards?: boolean;
  cardCount?: number;
  showTable?: boolean;
  tableRows?: number;
  showSidebar?: boolean;
}

export function PageSkeleton({
  showHeader = true,
  showCards = true,
  cardCount = 4,
  showTable = true,
  tableRows = 8,
  showSidebar = true,
}: PageSkeletonProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar Skeleton */}
      {showSidebar && (
        <div className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <Skeleton className="h-8 w-32 mb-4" />
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={showSidebar ? "ml-64" : ""}>
        {/* Header Skeleton */}
        {showHeader && (
          <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="h-full px-6 flex items-center">
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        )}

        {/* Page Content Skeleton */}
        <main className="p-6">
          <div className="space-y-6">
            {/* Title */}
            <Skeleton className="h-8 w-48" />

            {/* Cards */}
            {showCards && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(cardCount)].map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
              </div>
            )}

            {/* Table/Content */}
            {showTable && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <Skeleton className="h-6 w-40 mb-4" />
                <div className="space-y-3">
                  {[...Array(tableRows)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                      <div className="flex-1" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export function TasksSkeleton() {
  return (
    <PageSkeleton
      showCards={true}
      cardCount={3}
      showTable={true}
      tableRows={10}
    />
  );
}

export function DealsSkeleton() {
  return (
    <PageSkeleton
      showCards={true}
      cardCount={4}
      showTable={true}
      tableRows={12}
    />
  );
}

export function PipelineSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar Skeleton */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="h-full px-6 flex items-center">
            <Skeleton className="h-6 w-32" />
          </div>
        </div>

        {/* Pipeline Content */}
        <main className="p-6">
          <div className="space-y-6">
            <Skeleton className="h-8 w-40" />

            {/* Pipeline Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <Skeleton className="h-6 w-24 mb-4" />
                  <div className="space-y-3">
                    {[...Array(3)].map((_, j) => (
                      <Skeleton key={j} className="h-20 w-full rounded" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function CommunicationsSkeleton() {
  return (
    <PageSkeleton
      showCards={true}
      cardCount={3}
      showTable={true}
      tableRows={6}
    />
  );
}
