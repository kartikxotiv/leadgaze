'use client';

import * as React from 'react';

import { format, isAfter, isBefore, isValid, set, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

import { cn } from '../lib/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

/**
 * Props for the DateTimePicker component.
 */
interface DateTimePickerProps {
  /**
   * The currently selected date/time.
   */
  value?: Date;
  /**
   * Callback fired when the date/time changes.
   */
  onChange?: (date?: Date) => void;
  /**
   * The mode of the picker.
   * 'date' - Only select date.
   * 'time' - Only select time.
   * 'datetime' - Select both date and time.
   */
  mode?: 'date' | 'datetime' | 'time';
  /**
   * Alias for `mode="datetime" | "time"`. Will override mode if set to true.
   */
  showTime?: boolean;
  /**
   * The format for the hours column (12 or 24).
   */
  hourFormat?: 12 | 24;
  /**
   * The step interval for the minutes column.
   */
  minuteStep?: 1 | 5 | 10 | 15 | 30;
  /**
   * Placeholder text shown when no date is selected.
   */
  placeholder?: string;
  /**
   * Disables the entire picker.
   */
  disabled?: boolean;
  /**
   * The minimum selectable date.
   */
  minDate?: Date;
  /**
   * The maximum selectable date.
   */
  maxDate?: Date;
  /**
   * Custom function to disable specific dates in the calendar.
   */
  disabledDates?: (date: Date) => boolean;
  /**
   * Additional CSS classes for the trigger button.
   */
  className?: string;
}

const VISIBLE_COUNT = 7; // odd number so selected is always centered
const ITEM_HEIGHT = 36; // px

/**
 * Drum-roll / slot-machine style column.
 * No DOM scroll manipulation — mouse wheel and arrow buttons
 * advance the selected index, and the visible window follows.
 * Items loop infinitely (01 → 02 → … → 12 → 01 → …).
 */
function TimePickerColumn({
  options,
  value,
  onChange,
  disabled,
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const n = options.length;

  // The "center" index into the virtual infinite list
  const currentIndex = options.indexOf(value);
  const [centerIdx, setCenterIdx] = React.useState(
    currentIndex === -1 ? 0 : currentIndex,
  );

  // Sync if value changes externally
  React.useEffect(() => {
    const idx = options.indexOf(value);
    if (idx !== -1 && idx !== ((centerIdx % n) + n) % n) {
      setCenterIdx(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const step = (delta: number) => {
    if (disabled) return;
    const newCenter = centerIdx + delta;
    setCenterIdx(newCenter);
    const looped = ((newCenter % n) + n) % n;
    onChange(options[looped]!);
  };

  // Mouse wheel: use a non-passive native listener so preventDefault works.
  // React's synthetic onWheel is passive by default and cannot call preventDefault.
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const stepRef = React.useRef(step);
  stepRef.current = step; // keep ref current without re-subscribing

  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (stepRef.current) {
        if (e.deltaY > 0) stepRef.current(1);
        else if (e.deltaY < 0) stepRef.current(-1);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []); // attach once — stepRef.current stays up-to-date

  // Build the visible window: VISIBLE_COUNT items centered on centerIdx
  const half = Math.floor(VISIBLE_COUNT / 2);
  const visibleItems = Array.from({ length: VISIBLE_COUNT }, (_, i) => {
    const offset = i - half;
    const loopedIdx = ((centerIdx + offset) % n + n) % n;
    return {
      label: options[loopedIdx]!,
      offset,
      isSelected: offset === 0,
    };
  });

  const colHeight = VISIBLE_COUNT * ITEM_HEIGHT;

  return (
    <div
      ref={wrapperRef}
      className="relative flex flex-col items-center select-none"
      style={{ width: 64, userSelect: 'none' }}
    >
      {/* Up arrow */}
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => step(-1)}
        className="flex h-7 w-full items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
      </button>

      {/* Visible drum window */}
      <div
        className="relative overflow-hidden"
        style={{ height: colHeight, width: 64 }}
      >
        {/* Selection highlight bar */}
        <div
          className="pointer-events-none absolute left-0 right-0 rounded-md bg-primary/10 ring-1 ring-primary/20"
          style={{
            top: half * ITEM_HEIGHT,
            height: ITEM_HEIGHT,
          }}
        />

        {/* Items */}
        <div className="flex flex-col">
          {visibleItems.map(({ label, offset, isSelected }) => (
            <button
              key={offset}
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => {
                if (!isSelected) step(offset);
              }}
              className={[
                'flex items-center justify-center rounded transition-all duration-150',
                isSelected
                  ? 'text-primary font-semibold text-sm scale-105'
                  : Math.abs(offset) === 1
                    ? 'text-foreground/70 text-sm font-normal'
                    : 'text-muted-foreground/50 text-xs font-normal',
                !disabled && !isSelected ? 'cursor-pointer hover:text-foreground' : '',
                disabled ? 'pointer-events-none opacity-40' : '',
              ].join(' ')}
              style={{ height: ITEM_HEIGHT, width: 64 }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Down arrow */}
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => step(1)}
        className="flex h-7 w-full items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
  );
}


export function DateTimePicker({
  value,
  onChange,
  mode = 'datetime',
  showTime,
  hourFormat = 12,
  minuteStep = 1,
  placeholder = 'Select date and time',
  disabled = false,
  minDate,
  maxDate,
  disabledDates,
  className,
}: DateTimePickerProps) {
  const actualMode = showTime ? 'datetime' : mode;
  const [isOpen, setIsOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(value);

  React.useEffect(() => {
    setDate(value);
  }, [value]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Revert to original value when closed without saving
      setDate(value);
    }
    setIsOpen(open);
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const newDate = date
        ? set(selectedDate, {
            hours: date.getHours(),
            minutes: date.getMinutes(),
            seconds: 0,
            milliseconds: 0,
          })
        : set(selectedDate, {
            hours: new Date().getHours(),
            minutes: new Date().getMinutes(),
            seconds: 0,
            milliseconds: 0,
          });
      setDate(newDate);
    } else {
      setDate(undefined);
    }
  };

  const handleTimeChange = (type: 'hour' | 'minute' | 'ampm', val: string) => {
    if (!date) return;

    let newDate = new Date(date);

    if (type === 'hour') {
      let h = parseInt(val, 10);
      if (hourFormat === 12) {
        const isPM = newDate.getHours() >= 12;
        if (h === 12) h = 0;
        if (isPM) h += 12;
      }
      newDate = set(newDate, { hours: h });
    } else if (type === 'minute') {
      newDate = set(newDate, { minutes: parseInt(val, 10) });
    } else if (type === 'ampm') {
      const h = newDate.getHours();
      if (val === 'AM' && h >= 12) {
        newDate = set(newDate, { hours: h - 12 });
      } else if (val === 'PM' && h < 12) {
        newDate = set(newDate, { hours: h + 12 });
      }
    }

    setDate(newDate);
  };

  const hours = React.useMemo(() => {
    return Array.from({ length: hourFormat === 12 ? 12 : 24 }, (_, i) => {
      let val = i;
      if (hourFormat === 12) {
        val = i === 0 ? 12 : i;
      }
      return val.toString().padStart(2, '0');
    });
  }, [hourFormat]);

  const minutes = React.useMemo(() => {
    const length = Math.ceil(60 / minuteStep);
    return Array.from({ length }, (_, i) =>
      (i * minuteStep).toString().padStart(2, '0'),
    );
  }, [minuteStep]);

  const formatDisplay = () => {
    if (!date || !isValid(date)) return placeholder;
    if (actualMode === 'date') return format(date, 'MMM d, yyyy');
    if (actualMode === 'time')
      return format(date, hourFormat === 12 ? 'hh:mm a' : 'HH:mm');
    return format(
      date,
      hourFormat === 12 ? 'MMM d, yyyy hh:mm a' : 'MMM d, yyyy HH:mm',
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-between text-left font-normal h-[36px] px-2',
            !date && 'text-muted-foreground',
            className,
          )}
          disabled={disabled}
        >
          <span className="truncate">{formatDisplay()}</span>
          {actualMode === 'time' ? (
            <Clock className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          ) : (
            <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          {(actualMode === 'date' || actualMode === 'datetime') && (
            <div className="border-b p-3 sm:border-b-0 sm:border-r">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                disabled={(day) => {
                  let isDisabled = false;
                  if (minDate && isBefore(startOfDay(day), startOfDay(minDate)))
                    isDisabled = true;
                  if (maxDate && isAfter(startOfDay(day), startOfDay(maxDate)))
                    isDisabled = true;
                  if (disabledDates)
                    isDisabled = isDisabled || disabledDates(day);
                  return isDisabled;
                }}
                initialFocus
                captionLayout="dropdown"
                fromYear={minDate ? minDate.getFullYear() : 1900}
                toYear={
                  maxDate
                    ? maxDate.getFullYear()
                    : new Date().getFullYear() + 50
                }
              />
            </div>
          )}
          {(actualMode === 'time' || actualMode === 'datetime') && (
            <div className="flex gap-2 p-3">
              <TimePickerColumn
                options={hours}
                value={
                  date
                    ? (hourFormat === 12
                        ? date.getHours() % 12 || 12
                        : date.getHours()
                      )
                        .toString()
                        .padStart(2, '0')
                    : '12'
                }
                onChange={(val) => handleTimeChange('hour', val)}
                disabled={!date}
              />
              <TimePickerColumn
                options={minutes}
                value={
                  date
                    ? date.getMinutes().toString().padStart(2, '0')
                    : '00'
                }
                onChange={(val) => handleTimeChange('minute', val)}
                disabled={!date}
              />
              {hourFormat === 12 && (
                <div
                  className="flex w-16 flex-col items-center justify-center gap-2"
                  style={{ height: VISIBLE_COUNT * ITEM_HEIGHT + 28 }}
                >
                  <Button
                    variant={date && date.getHours() < 12 ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full px-2 text-center"
                    onClick={() => handleTimeChange('ampm', 'AM')}
                    disabled={!date}
                  >
                    AM
                  </Button>
                  <Button
                    variant={
                      date && date.getHours() >= 12 ? 'default' : 'ghost'
                    }
                    size="sm"
                    className="w-full px-2 text-center"
                    onClick={() => handleTimeChange('ampm', 'PM')}
                    disabled={!date}
                  >
                    PM
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t p-3">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDate(undefined);
                onChange?.(undefined);
                setIsOpen(false);
              }}
            >
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const now = new Date();
                setDate(now);
                onChange?.(now);
                if (actualMode === 'date') {
                  setIsOpen(false);
                }
              }}
            >
              Today
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => {
              onChange?.(date);
              setIsOpen(false);
            }}
          >
            Ok
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
