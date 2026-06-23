'use client';

import { createContext, useContext } from 'react';

// =====================================================
// CONTEXT TYPE
// =====================================================

export interface LocalizationContextType {
  /** Format a date using workspace preferences (dateFormat + timezone) */
  formatDate: (date: string | Date | null | undefined) => string;
  /** Alias for formatDate */
  formatDateOnly: (date: string | Date | null | undefined) => string;
  /** Format a date-time using workspace preferences (dateFormat + timeFormat + timezone) */
  formatDateTime: (date: string | Date | null | undefined) => string;
  /** Format a currency value using workspace default currency */
  formatCurrency: (value: number | string, currencyCode?: string) => string;
  /** Format a number using locale-aware formatting */
  formatNumber: (value: number) => string;
}

export const LocalizationContext = createContext<
  LocalizationContextType | undefined
>(undefined);

// =====================================================
// HOOK
// =====================================================

/**
 * Access workspace localization preferences and pre-bound formatters.
 *
 * @example
 * ```tsx
 * import { useLocalization } from '@kit/shared/localization';
 *
 * const { formatDate, formatCurrency } = useLocalization();
 *
 * <span>{formatCurrency(lead.annual_revenue)}</span>
 * <span>{formatDate(lead.created_at)}</span>
 * ```
 */
export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error(
      'useLocalization must be used within a LocalizationProvider',
    );
  }
  return context;
}
