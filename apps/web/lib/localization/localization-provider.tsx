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
};

// =====================================================
// PROVIDER
// =====================================================

export function LocalizationProvider({
  children,
}: React.PropsWithChildren) {
  const { currentWorkspace } = useRBAC();
  const supabase = useSupabase();

  // Fetch workspace preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['workspace-preferences', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return DEFAULT_PREFERENCES;

      const { data, error } = await supabase
        .from('workspace_preferences')
        .select('timezone, date_format, time_format, default_currency')
        .eq('workspace_id', currentWorkspace.id)
        .single();

      if (error || !data) return DEFAULT_PREFERENCES;

      return {
        timezone: data.timezone,
        dateFormat: data.date_format,
        timeFormat: data.time_format as '12h' | '24h',
        defaultCurrency: data.default_currency,
      } satisfies WorkspaceLocalizationPreferences;
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes — preferences rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
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
    };
  }, [resolvedPreferences, isLoading]);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}
