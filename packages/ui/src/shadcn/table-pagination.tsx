'use client';

import * as React from 'react';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination';
import { PageSizeSelector } from './page-size-selector';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const getPaginationItems = (currentPage: number, totalPages: number) => {
  // If there are 5 or fewer pages, just show them all
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }).map((_, i) => i + 1);
  }

  // If we are near the beginning (pages 1, 2, or 3)
  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages];
  }

  // If we are near the end
  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 2, totalPages - 1, totalPages];
  }

  // If we are somewhere in the middle
  return [1, '...', currentPage, '...', totalPages];
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TablePaginationProps {
  /** The current active page (1-based). */
  currentPage: number;
  /** Total number of pages. */
  totalPages: number;
  /** Total number of records across all pages. */
  totalCount: number;
  /** Number of records shown per page. */
  pageSize: number;
  /** Called when the user navigates to a different page. */
  onPageChange: (page: number) => void;
  /** Called when the user changes the page size. */
  onPageSizeChange: (size: number) => void;
  /**
   * Label shown after the count, e.g. "entries", "leads", "notes".
   * Defaults to "entries".
   */
  entityLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A reusable pagination bar that includes:
 * - "Showing X to Y of Z {entityLabel}" summary
 * - Page-size selector
 * - Previous / Next navigation with numbered page links
 *
 * Only renders when `totalCount > 0`.
 */
export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  entityLabel = 'entries',
}) => {
  if (totalCount <= 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="primary-text-regular text-leadgaze-muted bg-sidebar sticky bottom-0 z-10 -mx-4 flex shrink-0 items-center justify-between border-t px-4 py-1.5 lg:-mx-8 lg:px-8 flex-wrap sm:flex-nowrap">
      <div className="flex items-center gap-1">
        Showing{' '}
        <span className="primary-text-regular text-leadgaze-muted">
          {start}
        </span>{' '}
        to{' '}
        <span className="primary-text-regular text-leadgaze-muted">
          {end}
        </span>{' '}
        of{' '}
        <span className="primary-text-regular text-leadgaze-muted">
          {totalCount}
        </span>{' '}
        {entityLabel}
      </div>
      <div className="flex w-full max-w-full min-w-0 items-center justify-end px-2">
        <PageSizeSelector
          value={pageSize}
          onChange={onPageSizeChange}
        />
      </div>
      <Pagination className="w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              className={
                currentPage === 1
                  ? 'pointer-events-none opacity-50'
                  : 'cursor-pointer'
              }
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            />
          </PaginationItem>
          {getPaginationItems(currentPage, totalPages).map((item, i) => (
            <PaginationItem key={i}>
              {item === '...' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  isActive={currentPage === item}
                  onClick={() => onPageChange(item as number)}
                  className="cursor-pointer"
                >
                  {item}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              className={
                currentPage === totalPages
                  ? 'pointer-events-none opacity-50'
                  : 'cursor-pointer'
              }
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default TablePagination;
