'use client';

import React, { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  LocalizationContext,
  type LocalizationContextType,
} from '@kit/shared/localization';
import {
  type WorkspaceLocalizationPreferences,
  formatCurrency as sharedFormatCurrency,
  formatDate as sharedFormatDate,
  formatDateTime as sharedFormatDateTime,
  formatNumber as sharedFormatNumber,
} from '@kit/shared/utils';

import { convertFromUSD } from '@kit/shared/currency';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useRBAC } from '~/lib/rbac/rbac-provider';

// Re-export hook for convenience so web-app components can import from here
export { useLocalization } from '@kit/shared/localization';

// =====================================================
// DEFAULTS
// =====================================================

const DEFAULT_PREFERENCES: WorkspaceLocalizationPreferences = {
  timezone: 'UTC',
  dateFormat: 'MM-DD-YYYY',
  timeFormat: '12h',
  defaultCurrency: 'USD',
  enabledCurrencies: ['USD'],
};

// =====================================================
// PROVIDER
// =====================================================

export function LocalizationProvider({
  children,
}: React.PropsWithChildren) {
  const { currentWorkspace, isInitialized } = useRBAC();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['workspace-preferences', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return DEFAULT_PREFERENCES;
      
      // Use cached workspace-init data if available
      const cachedData = typeof window !== 'undefined' 
        ? JSON.parse(sessionStorage.getItem(`workspace-${currentWorkspace.id}-init`) || '{}') 
        : null;
        
      if (cachedData?.current_workspace?.localization) {
        return {
          timezone: cachedData.current_workspace.localization.timezone,
          dateFormat: cachedData.current_workspace.localization.date_format,
          timeFormat: cachedData.current_workspace.localization.time_format,
          defaultCurrency: cachedData.current_workspace.localization.default_currency,
          enabledCurrencies: cachedData.current_workspace.localization.enabled_currencies || ['USD'],
        } as WorkspaceLocalizationPreferences;
      }
      
      return DEFAULT_PREFERENCES;
    },
    enabled: !!currentWorkspace?.id && isInitialized,
    staleTime: 5 * 60 * 1000,
  });

  const resolvedPreferences = preferences || DEFAULT_PREFERENCES;

  // Build pre-bound formatters memoized on preferences
  const value = useMemo<LocalizationContextType>(() => {
    const prefs = resolvedPreferences;

    return {
      formatDate: (date) =>
        sharedFormatDate(date, {
          dateFormat: prefs.dateFormat,
          timezone: prefs.timezone,
        }),

      formatDateOnly: (date) =>
        sharedFormatDate(date, {
          dateFormat: prefs.dateFormat,
          timezone: prefs.timezone,
        }),

      formatDateTime: (date) =>
        sharedFormatDateTime(date, {
          dateFormat: prefs.dateFormat,
          timeFormat: prefs.timeFormat,
          timezone: prefs.timezone,
        }),

      formatCurrency: (val, code) =>
        sharedFormatCurrency({
          value: val,
          currencyCode: code || prefs.defaultCurrency,
        }),

      formatNumber: (val) => sharedFormatNumber(val),

      convertCurrency: (baseAmountUsd, targetCurrency, rateToTarget) =>
        sharedFormatCurrency({
          value: convertFromUSD(baseAmountUsd, rateToTarget),
          currencyCode: targetCurrency,
        }),
    };
  }, [resolvedPreferences, isLoading]);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}
