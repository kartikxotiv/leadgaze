'use client';

import { useEffect, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CircleDollarSign, Loader2, Save } from 'lucide-react';

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
import { Label } from '@kit/ui/label';

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
  { code: 'EUR', symbol: '€', label: 'EUR - Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP - British Pound' },
  { code: 'INR', symbol: '₹', label: 'INR - Indian Rupee' },
  { code: 'AED', symbol: 'AED', label: 'AED - UAE Dirham' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD - Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'AUD - Australian Dollar' },
  { code: 'JPY', symbol: '¥', label: 'JPY - Japanese Yen' },
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

  const resetForm = () => {
    if (preferences) {
      setForm({
        timezone: preferences.timezone,
        dateFormat: preferences.date_format,
        timeFormat: preferences.time_format,
        defaultCurrency: preferences.default_currency,
        enabledCurrencies: preferences.enabledCurrencies || ['USD'],
      });
    }
  };

  // Sync form with fetched data
  useEffect(() => {
    resetForm();
  }, [preferences]);

  const isDateTimeDirty = preferences && (
    form.timezone !== preferences.timezone ||
    form.dateFormat !== preferences.date_format ||
    form.timeFormat !== preferences.time_format
  );

  const isCurrencyDirty = preferences && (
    form.defaultCurrency !== preferences.default_currency
  );

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
      queryClient.invalidateQueries({
        queryKey: ['workspace-currencies', workspaceId],
      });
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

  const handleCancelDateTime = () => {
    if (preferences) {
      setForm(prev => ({
        ...prev,
        timezone: preferences.timezone,
        dateFormat: preferences.date_format,
        timeFormat: preferences.time_format,
      }));
    }
  };

  const handleCancelCurrency = () => {
    if (preferences) {
      setForm(prev => ({
        ...prev,
        defaultCurrency: preferences.default_currency,
      }));
    }
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
        <CardHeader className="flex flex-row items-center justify-between p-2 border-b border-slate-200">
          <div>
            <CardTitle className="mb-0 flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              Date &amp; Time
            </CardTitle>
            <CardDescription>
              Configure how dates and times are displayed across the workspace.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelDateTime}
              disabled={!isDateTimeDirty || updateMutation.isPending}
              className="secondary-text-small-bold gap-1.5 px-2"
            >
              Cancel
            </Button>
            <Button
              
              onClick={handleSave}
              disabled={!isDateTimeDirty || updateMutation.isPending}
              className="bg-leadgaze-primary hover:bg-leadgaze-primary text-white secondary-text-small-bold gap-1.5 px-2"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-2 main-dialog">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Timezone */}
            <div>
              <Label>Timezone</Label>
              <Select
                value={form.timezone}
                onValueChange={(v) => handleChange('timezone', v)}
              >
                <SelectTrigger className="w-full">
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
            <div>
              <Label>Date Format</Label>
              <Select
                value={form.dateFormat}
                onValueChange={(v) => handleChange('dateFormat', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Format */}
            <div>
              <Label>Time Format</Label>
              <Select
                value={form.timeFormat}
                onValueChange={(v) =>
                  handleChange('timeFormat', v as '12h' | '24h')
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Currency Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-2 border-b border-slate-200">
          <div>
            <CardTitle className="mb-0 flex items-center gap-2 text-base">
              <CircleDollarSign className="h-4 w-4" />
              Currencies
            </CardTitle>
            <CardDescription>
              Manage currencies enabled for this workspace.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelCurrency}
              disabled={!isCurrencyDirty || updateMutation.isPending}
              className="secondary-text-small-bold gap-1.5 px-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isCurrencyDirty || updateMutation.isPending}
              className="bg-leadgaze-primary hover:bg-leadgaze-primary text-white secondary-text-small-bold gap-1.5 px-2"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 main-dialog">
            {/* Default Currency */}
            <div>
              <Label>Default Currency</Label>
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
            <div>
              <Label>Add Currency</Label>
              <Select
                onValueChange={(v) => handleAddCurrency(v)}
                disabled={addCurrencyMutation.isPending}
                value=""
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a currency add" />
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
            
            {/* Display Enable Currencies */}
            <div>
              <Label>Enable Currencies</Label>
              <Select disabled value={form.defaultCurrency}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={form.defaultCurrency}>{form.defaultCurrency}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Enabled Currencies List */}
          <div className="space-y-2">
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
                      className="flex items-center gap-1.5 py-1.5 px-2 text-sm font-normal animate-in fade-in-50 duration-200 h-8"
                    >
                      <span className="font-semibold">{currency.currency_code}</span>
                      <span>
                        ({currencyInfo?.symbol || currency.currency_code})
                      </span>
                      {isDefault ? (
                        <span className="bg-primary-foreground text-primary ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider pt-1">
                          Default
                        </span>
                      ) : deleteCurrencyMutation.isPending && deleteCurrencyMutation.variables === currency.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin ml-1 text-muted-foreground" />
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
    </div>
  );
}
