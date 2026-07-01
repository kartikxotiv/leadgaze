import * as React from 'react';
import { ChevronLeft } from 'lucide-react';
import { DateRangeValue } from './list-toolbar';
import { Calendar } from './calendar';
import { Button } from './button';
import { cn } from '../lib/utils';
import { DateRange } from 'react-day-picker';

interface DateRangePickerPanelProps {
  value: DateRangeValue | null;
  onChange: (val: DateRangeValue | null) => void;
  onClose: () => void;
}

const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'This Month', value: 'this_month' },
  { label: 'This Year', value: 'this_year' },
] as const;

export function DateRangePickerPanel({
  value,
  onChange,
  onClose,
}: DateRangePickerPanelProps) {
  const [view, setView] = React.useState<'presets' | 'calendar'>('presets');
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(() => {
    if (value?.preset === 'custom' && value.from) {
      return {
        from: new Date(value.from),
        to: value.to ? new Date(value.to) : undefined,
      };
    }
    return undefined;
  });

  const handlePresetClick = (preset: typeof PRESETS[number]['value']) => {
    onChange({ preset, from: null, to: null });
    onClose();
  };

  const handleApplyCustom = () => {
    if (tempRange?.from) {
      onChange({
        preset: 'custom',
        from: tempRange.from.toISOString().split('T')[0] ?? null,
        to: tempRange.to ? tempRange.to.toISOString().split('T')[0] : tempRange.from.toISOString().split('T')[0] ?? null,
      });
      onClose();
    }
  };

  if (view === 'presets') {
    return (
      <div className="flex flex-col py-1 min-w-[200px]">
        {PRESETS.map((preset) => {
          const isSelected = value?.preset === preset.value;
          return (
            <button
              key={preset.value}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => handlePresetClick(preset.value)}
            >
              <span className={cn(isSelected && 'font-medium text-blue-600')}>{preset.label}</span>
              {isSelected && <span className="text-blue-600 text-xs">✓</span>}
            </button>
          );
        })}
        <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
        <button
          className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setView('calendar')}
        >
          <span className={cn(value?.preset === 'custom' && 'font-medium text-blue-600')}>Custom Date</span>
          <span className="text-gray-400">→</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-[240px]">
      <div className="flex items-center p-2 border-b">
        <Button variant="ghost" size="icon" onClick={() => setView('presets')} className="h-6 w-6">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium ml-2">Custom Date</span>
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
      <div className="flex items-center justify-end gap-2 p-2 border-t">
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
          Cancel
        </Button>
        <Button variant="default" size="sm" onClick={handleApplyCustom} disabled={!tempRange?.from} className="text-xs">
          Apply
        </Button>
      </div>
    </div>
  );
}
