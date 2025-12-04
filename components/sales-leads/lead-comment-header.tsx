"use client";

interface LeadCommentHeaderProps {
  commentsCount: number;
  isLoading: boolean;
}

export function LeadCommentHeader({
  commentsCount,
  isLoading,
}: LeadCommentHeaderProps) {
  return (
    <div className="px-4 py-[18px] border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Activity
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            {isLoading ? "…" : commentsCount}
          </span>
        </div>
      </div>
    </div>
  );
}
