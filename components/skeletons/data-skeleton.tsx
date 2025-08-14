"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface DataSkeletonProps {
  type?: "table" | "cards" | "list" | "pipeline";
  count?: number;
}

export function DataSkeleton({ type = "table", count = 8 }: DataSkeletonProps) {
  switch (type) {
    case "cards":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(count)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </div>
      );

    case "list":
      return (
        <div className="space-y-4">
          {[...Array(count)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );

    case "pipeline":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div
                    key={j}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                  >
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    case "table":
    default:
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[...Array(count)].map((_, i) => (
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
        </div>
      );
  }
}
