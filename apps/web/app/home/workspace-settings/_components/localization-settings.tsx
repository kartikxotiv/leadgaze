'use client';

import { useEffect, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Loader2, Save } from 'lucide-react';

import {
  type WorkspaceLocalizationPreferences,
} from '@kit/shared/utils';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Badge } from '@kit/ui/badge';
import { toast } from 'sonner';
import { X } from 'lucide-react';

import {
  getWorkspacePreferencesService,
  updateWorkspacePreferencesService,
  type UpdatePreferencesPayload,
} from '~/services/workspace-preferences.service';

import {
  getWorkspaceCurrenciesService,
  addWorkspaceCurrencyService,
  updateWorkspaceCurrencyService,
  deleteWorkspaceCurrencyService,
} from '~/services/workspace-currencies.service';

// =====================================================
// CONSTANTS
// =====================================================

const DATE_FORMAT_OPTIONS = [
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', example: '23-06-2026' },
  { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY', example: '06-23-2026' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2026-06-23' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '23/06/2026' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '06/23/2026' },
  { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD', example: '2026/06/23' },
];

const TIME_FORMAT_OPTIONS = [
  { value: '12h', label: '12 Hour', example: '02:30 PM' },
  { value: '24h', label: '24 Hour', example: '14:30' },
];

const COMMON_CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD - US Dollar' },
  { code: 'EUR', symbol: '\u20ac', label: 'EUR - Euro' },
  { code: 'GBP', symbol: '\u00a3', label: 'GBP - British Pound' },
  { code: 'INR', symbol: '\u20b9', label: 'INR - Indian Rupee' },
  { code: 'AED', symbol: 'AED', label: 'AED - UAE Dirham' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD - Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'AUD - Australian Dollar' },
  { code: 'JPY', symbol: '\u00a5', label: 'JPY - Japanese Yen' },
  { code: 'SGD', symbol: 'S$', label: 'SGD - Singapore Dollar' },
  { code: 'CHF', symbol: 'CHF', label: 'CHF - Swiss Franc' },
];

// Timezone list - common IANA timezones
const COMMON_TIMEZONES = (() => {
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Pacific/Auckland',
  ];
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    // Fallback for environments that don't support Intl.supportedValuesOf
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Kolkata',
      'Asia/Dubai',
      'Asia/Singapore',
      'Asia/Tokyo',
      'Australia/Sydney',
      'Pacific/Auckland',
    ];
  }
})();

// =====================================================
// COMPONENT
// =====================================================

export function WorkspaceLocalizationSettings({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<WorkspaceLocalizationPreferences>({
    timezone: 'UTC',
    dateFormat: 'MM-DD-YYYY',
    timeFormat: '12h',
    defaultCurrency: 'USD',
    enabledCurrencies: ['USD'],
  });

  const [isDirty, setIsDirty] = useState(false);

  // Fetch current preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['workspace-preferences-settings', workspaceId],
    queryFn: () => getWorkspacePreferencesService(workspaceId),
    enabled: !!workspaceId,
  });

  // Fetch enabled currencies
  const { data: currenciesData, isLoading: isCurrenciesLoading } = useQuery({
    queryKey: ['workspace-currencies', workspaceId],
    queryFn: () => getWorkspaceCurrenciesService(workspaceId),
    enabled: !!workspaceId,
  });

  // Sync form with fetched data
  useEffect(() => {
    if (preferences) {
      setForm({
        timezone: preferences.timezone,
        dateFormat: preferences.date_format,
        timeFormat: preferences.time_format,
        defaultCurrency: preferences.default_currency,
        enabledCurrencies: preferences.enabledCurrencies || ['USD'],
      });
    }
  }, [preferences]);

  // Get list of currencies added to workspace for the default currency dropdown
  const addedCurrencies = currenciesData?.map((c) => {
    const currencyInfo = COMMON_CURRENCIES.find((cur) => cur.code === c.currency_code);
    return {
      ...c,
      label: currencyInfo?.label || c.currency_code,
      symbol: currencyInfo?.symbol || '',
    };
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePreferencesPayload) =>
      updateWorkspacePreferencesService(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-preferences', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace-preferences-settings', workspaceId],
      });
      setIsDirty(false);
      toast.success('Preferences saved', {
        description: 'Localization settings have been updated.',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to save', {
        description: error?.message || 'Something went wrong.',
      });
    },
  });

  // Add currency mutation
  const addCurrencyMutation = useMutation({
    mutationFn: (payload: {
      workspace_id: string;
      currency_code: string;
      currency_symbol: string;
      is_default?: boolean;
    }) => addWorkspaceCurrencyService(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-currencies', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace-preferences', workspaceId],
      });
      toast.success('Currency added', {
        description: 'The currency has been added to your workspace.',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to add currency', {
        description: error?.message || 'Something went wrong.',
      });
    },
  });

  // Delete currency mutation
  const deleteCurrencyMutation = useMutation({
    mutationFn: (currencyId: string) =>
      deleteWorkspaceCurrencyService(currencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-currencies', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace-preferences', workspaceId],
      });
      toast.success('Currency removed', {
        description: 'The currency has been removed from your workspace.',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to remove currency', {
        description: error?.message || 'Something went wrong.',
      });
    },
  });

  const handleChange = (
    field: keyof WorkspaceLocalizationPreferences,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleAddCurrency = (currencyCode: string) => {
    const currencyInfo = COMMON_CURRENCIES.find(
      (c) => c.code === currencyCode,
    );
    if (!currencyInfo) return;

    addCurrencyMutation.mutate({
      workspace_id: workspaceId,
      currency_code: currencyCode,
      currency_symbol: currencyInfo.symbol,
      is_default: false,
    });
  };

  const handleRemoveCurrency = (currencyId: string) => {
    deleteCurrencyMutation.mutate(currencyId);
  };

  const handleSave = () => {
    updateMutation.mutate({
      workspace_id: workspaceId,
      timezone: form.timezone,
      date_format: form.dateFormat,
      time_format: form.timeFormat,
      default_currency: form.defaultCurrency,
    });
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading preferences...
      </div>
    );
  }

  const selectedDateFormat = DATE_FORMAT_OPTIONS.find(
    (o) => o.value === form.dateFormat,
  );
  const selectedTimeFormat = TIME_FORMAT_OPTIONS.find(
    (o) => o.value === form.timeFormat,
  );

  return (
    <div className="space-y-6">
      {/* Date & Time Settings */}
      <Card>
        <CardHeader className="p-4 pb-3">
          <CardTitle className="mb-0 flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Date &amp; Time
          </CardTitle>
          <CardDescription>
            Configure how dates and times are displayed across the workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          {/* Timezone */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Timezone</label>
            <Select
              value={form.timezone}
              onValueChange={(v) => handleChange('timezone', v)}
            >
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Format */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date Format</label>
            <Select
              value={form.dateFormat}
              onValueChange={(v) => handleChange('dateFormat', v)}
            >
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                    <span className="text-muted-foreground ml-2 text-xs">
                      (e.g. {opt.example})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDateFormat && (
              <p className="text-muted-foreground text-xs">
                Example: {selectedDateFormat.example}
              </p>
            )}
          </div>

          {/* Time Format */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Time Format</label>
            <Select
              value={form.timeFormat}
              onValueChange={(v) =>
                handleChange('timeFormat', v as '12h' | '24h')
              }
            >
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                    <span className="text-muted-foreground ml-2 text-xs">
                      (e.g. {opt.example})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTimeFormat && (
              <p className="text-muted-foreground text-xs">
                Example: {selectedTimeFormat.example}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Currency Settings */}
      <Card>
        <CardHeader className="p-4 pb-3">
          <CardTitle className="mb-0 text-base">Currencies</CardTitle>
          <CardDescription>
            Manage currencies enabled for this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Default Currency */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Default Currency</label>
              <Select
                value={form.defaultCurrency}
                onValueChange={(v) => handleChange('defaultCurrency', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {addedCurrencies && addedCurrencies.length > 0 ? (
                    addedCurrencies.map((cur) => (
                      <SelectItem key={cur.currency_code} value={cur.currency_code}>
                        {cur.symbol} {cur.label}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="placeholder" disabled>
                      No currencies added yet
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Add Currency */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Add Currency</label>
              <Select
                onValueChange={(v) => handleAddCurrency(v)}
                disabled={addCurrencyMutation.isPending}
                value=""
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a currency to add" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CURRENCIES.map((cur) => {
                    const isAdded = currenciesData?.some(
                      (c) => c.currency_code === cur.code,
                    );
                    return (
                      <SelectItem
                        key={cur.code}
                        value={cur.code}
                        disabled={isAdded}
                      >
                        {cur.symbol} {cur.label}
                        {isAdded && ' (Added)'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Enabled Currencies List */}
          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium">Enabled Currencies</label>
            {isCurrenciesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading currencies...
              </div>
            ) : currenciesData && currenciesData.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {currenciesData.map((currency) => {
                  const currencyInfo = COMMON_CURRENCIES.find(
                    (c) => c.code === currency.currency_code,
                  );
                  const isDefault = currency.currency_code === form.defaultCurrency;
                  return (
                    <Badge
                      key={currency.id}
                      variant={isDefault ? 'default' : 'secondary'}
                      className="flex items-center gap-1.5 py-1.5 px-3 text-sm font-normal animate-in fade-in-50 duration-200"
                    >
                      <span className="font-semibold">{currency.currency_code}</span>
                      <span className="text-muted-foreground/80 text-xs">
                        ({currencyInfo?.symbol || currency.currency_code})
                      </span>
                      {isDefault ? (
                        <span className="bg-primary-foreground text-primary ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveCurrency(currency.id)}
                          disabled={deleteCurrencyMutation.isPending}
                          className="hover:bg-muted ml-1 rounded-full p-0.5 transition-colors focus:outline-none"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                No currencies enabled yet. Select one above to enable.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {isDirty && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="gap-2"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Preferences
          </Button>
        </div>
      )}
    </div>
  );
}
