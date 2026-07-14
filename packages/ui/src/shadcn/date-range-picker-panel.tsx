import * as React from 'react';

import { ChevronLeft } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '../lib/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { DateRangeValue } from './list-toolbar';

interface DateRangePickerPanelProps {
  value: DateRangeValue | null;
  onChange: (val: DateRangeValue | null) => void;
  onClose: () => void;
}

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'This Quarter', value: 'this_quarter' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last Six Months', value: 'last_six_months' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Last Year', value: 'last_year' },
] as const;

export function DateRangePickerPanel({
  value,
  onChange,
  onClose,
}: DateRangePickerPanelProps) {
  const [view, setView] = React.useState<'presets' | 'calendar'>('presets');
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(
    () => {
      if (value?.preset === 'custom' && value.from) {
        return {
          from: new Date(value.from),
          to: value.to ? new Date(value.to) : undefined,
        };
      }
      return undefined;
    },
  );

  const handlePresetClick = (preset: (typeof PRESETS)[number]['value']) => {
    onChange({ preset, from: null, to: null });
    onClose();
  };

  const handleApplyCustom = () => {
    if (tempRange?.from) {
      const formatLocalDate = (date: Date) => 
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      const from = formatLocalDate(tempRange.from);
      const to = tempRange.to ? formatLocalDate(tempRange.to) : from;
      
      onChange({
        preset: 'custom',
        from,
        to,
      });
      onClose();
    }
  };

  if (view === 'presets') {
    return (
      <div className="flex max-h-[200px] min-w-[200px] flex-col">
        {/* Scrollable presets */}
        <div className="flex-1 overflow-y-auto py-1">
          {PRESETS.map((preset) => {
            const isSelected = value?.preset === preset.value;
            return (
              <button
                key={preset.value}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handlePresetClick(preset.value)}
              >
                <span className={cn(isSelected && 'font-medium text-blue-600')}>
                  {preset.label}
                </span>
                {isSelected && <span className="text-xs text-blue-600">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Footer (fixed at bottom) */}
        <div className="border-t border-gray-100 dark:border-gray-800">
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setView('calendar')}
          >
            <span
              className={cn(
                value?.preset === 'custom' && 'font-medium text-blue-600',
              )}
            >
              Custom Date
            </span>
            <span className="text-gray-400">→</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-[240px] flex-col">
      <div className="flex items-center border-b p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setView('presets')}
          className="h-6 w-6"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="ml-2 text-sm font-medium">Custom Date</span>
      </div>
      <div className="p-2">
        <Calendar
          mode="range"
          selected={tempRange}
          onSelect={setTempRange}
          className="[&_button]:text-[12px]"
          initialFocus
        />
      </div>
      <div className="flex items-center justify-end gap-2 border-t p-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
          Cancel
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleApplyCustom}
          disabled={!tempRange?.from}
          className="text-xs"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
