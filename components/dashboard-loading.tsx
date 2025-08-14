"use client";

export function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar Skeleton */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-100 dark:bg-gray-600 rounded animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Header Skeleton */}
        <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="h-full px-6 flex items-center">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Page Content Skeleton */}
        <main className="p-6">
          <div className="space-y-6">
            {/* Title */}
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse"
                ></div>
              ))}
            </div>

            {/* Large card */}
            <div className="h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse"></div>
          </div>
        </main>
      </div>
    </div>
  );
}
