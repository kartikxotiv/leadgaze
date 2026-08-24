'use client';

import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PageSizeOption {
  /** The numeric value for records per page. Use a very large number (e.g. 10000) for "All". */
  value: number;
  /** The label to display in the dropdown. */
  label: string;
}

export interface PageSizeSelectorProps {
  /** The current page size value. */
  value: number;
  /**
   * Called when the user picks a different page size.
   * Receives the new numeric value (use 10000 or similar for "All").
   */
  onChange: (value: number) => void;
  /**
   * Override the default page size options.
   * Defaults to: 15, 25, 50, 100, All (10000).
   */
  options?: PageSizeOption[];
  /** Label shown before the selector. Defaults to "Records per page". */
  label?: string;
  /** Additional className applied to the outer wrapper div. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: PageSizeOption[] = [
  { value: 15, label: '15' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },  
];

// The sentinel value stored in the <Select> for the "All" option
const ALL_SENTINEL = 'all';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A small, reusable records-per-page selector built on top of shadcn <Select>.
 *
 * Default page sizes: **15, 25, 50, 100, All**.
 *
 * Usage:
 * ```tsx
 * const [pageSize, setPageSize] = useState(25);
 *
 * <PageSizeSelector value={pageSize} onChange={setPageSize} />
 * ```
 *
 * Designed to sit above a data table alongside pagination controls.
 */
export const PageSizeSelector: React.FC<PageSizeSelectorProps> = ({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  label = 'Records per page',
  className,
}) => {
  /** Convert a numeric value to the string key used by <Select>. */
  const toSelectValue = (v: number): string => {
    const opt = options.find((o) => o.value === v);
    return opt?.label === 'All' ? ALL_SENTINEL : String(v);
  };

  const handleChange = (raw: string) => {
    if (raw === ALL_SENTINEL) {
      // Find the "All" option and use its numeric value
      const allOption = options.find((o) => o.label === 'All');
      onChange(allOption?.value ?? 10000);
    } else {
      onChange(Number(raw));
    }
  };

  return (
    <div
      className={`flex items-center gap-2 ${className ?? ''}`}
    >
      {label && (
        <span className="text-leadgaze-muted whitespace-nowrap secondary-text-small-regular">
          {label}
        </span>
      )}
      <Select value={toSelectValue(value)} onValueChange={handleChange}>
        <SelectTrigger className="h-5 min-w-[62px] text-sm border-light-gray secondary-text-small-regular text-leadgaze-dark dark:text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem
              key={opt.label}
              value={opt.label === 'All' ? ALL_SENTINEL : String(opt.value)}
              className='secondary-text-small-regular'
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
