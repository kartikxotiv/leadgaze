'use client';

import * as React from 'react';

import { format, set } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

import { cn } from '../lib/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Textarea } from './textarea';
import { Input } from './input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TimeLogValue {
  /** Total duration in minutes (no rounding) */
  durationMinutes: number;
  /** Selected date + start time as ISO string */
  dateTime: string;
  /** Start time as Date */
  startTime: Date;
  /** End time as Date (startTime + duration) */
  endTime: Date;
  /** Description text */
  description: string;
  /** Activities text */
  activities?: string;
}

export interface CustomTimeLogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Title shown in the dialog header */
  title?: string;
  /** Subtitle / context shown below the title */
  subtitle?: string;
  /** Called when the user clicks Save */
  onSave: (value: TimeLogValue) => void;
  /** Whether the save button is in loading state */
  isSaving?: boolean;
  /** Initial duration string (e.g. "2h 30m") */
  initialDuration?: string;
  /** Initial date */
  initialDate?: Date;
  /** Initial description */
  initialDescription?: string;
  /** Initial activities */
  initialActivities?: string;
  /** Show cancel button (default true) */
  showCancel?: boolean;
  /** Show skip button */
  showSkip?: boolean;
  /** Called when user clicks skip */
  onSkip?: () => void;
  /** Whether skip is disabled */
  skipDisabled?: boolean;
  /** Save button label */
  saveLabel?: string;
  /** Additional info shown below title (e.g. total logged time) */
  headerExtra?: React.ReactNode;
  /** Show activities input field */
  showActivities?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse a duration string like "2h 30m 10s" into total seconds */
function parseDuration(input: string): { hours: number; minutes: number; seconds: number } {
  const cleaned = input.trim().toLowerCase();
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  // Match patterns like "2h", "30m", "10s"
  const hMatch = cleaned.match(/(\d+)\s*h/);
  const mMatch = cleaned.match(/(\d+)\s*m/);
  const sMatch = cleaned.match(/(\d+)\s*s/);

  if (hMatch) hours = parseInt(hMatch[1]!, 10);
  if (mMatch) minutes = parseInt(mMatch[1]!, 10);
  if (sMatch) seconds = parseInt(sMatch[1]!, 10);

  return { hours, minutes, seconds };
}

/** Normalize overflow: 70m → 1h 10m, 90s → 1m 30s */
function normalizeDuration(h: number, m: number, s: number): { hours: number; minutes: number; seconds: number } {
  // Carry seconds into minutes
  const extraMinFromSec = Math.floor(s / 60);
  s = s % 60;
  m = m + extraMinFromSec;

  // Carry minutes into hours
  const extraHourFromMin = Math.floor(m / 60);
  m = m % 60;
  h = h + extraHourFromMin;

  return { hours: h, minutes: m, seconds: s };
}

/** Format normalized duration to display string */
function formatDuration(h: number, m: number, s: number): string {
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);
  return parts.length > 0 ? parts.join(' ') : '0h';
}

/** Convert total minutes to h/m string */
function minutesToDisplay(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return formatDuration(h, m, 0);
}

// ─── Smart Time Input ───────────────────────────────────────────────────────

interface SmartTimeInputProps {
  value: string;
  onChange: (value: string) => void;
  normalizedDisplay: string;
  className?: string;
}

function SmartTimeInput({ value, onChange, normalizedDisplay, className }: SmartTimeInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl/Cmd shortcuts — explicitly handle Ctrl+A for Radix Dialog compatibility
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'a' || e.key === 'A') {
        e.stopPropagation();
        // Explicitly select all text in case Radix captures the event
        setTimeout(() => inputRef.current?.select(), 0);
      }
      // Allow all other Ctrl/Cmd combos (Ctrl+C, Ctrl+V, Ctrl+X, etc.)
      return;
    }

    // Allow Shift combos for text selection (Shift+Home, Shift+End, Shift+Arrow, etc.)
    if (e.shiftKey) {
      return;
    }

    // Allow navigation/editing keys
    if (
      ['Backspace', 'Delete', 'Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)
    ) {
      return;
    }

    // Enter: finalize value (auto-suffix, normalize) and blur
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) {
        const suffixed = autoSuffixOnSpace(value, value.length);
        const parsed = parseDuration(suffixed);
        const normalized = normalizeDuration(parsed.hours, parsed.minutes, parsed.seconds);
        const formatted = formatDuration(normalized.hours, normalized.minutes, normalized.seconds);
        onChange(formatted);
      }
      inputRef.current?.blur();
      return;
    }

    // Allow: digits, h, m, s, and space (let them go through naturally to handleChange)
    if (/^[0-9hms ]$/.test(e.key)) {
      return;
    }

    // Block everything else
    e.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Sanitize: only allow digits, h, m, s, and spaces
    val = val.replace(/[^0-9hms\s]/gi, '').toLowerCase();

    // Auto-suffix bare numbers when space is typed after them
    // Detect pattern: bare digit(s) followed by trailing whitespace (e.g., "2 " or "1h 30 ")
    if (/\d\s+$/.test(val)) {
      const trimmed = val.trimEnd();
      const suffixed = autoSuffixOnSpace(trimmed, trimmed.length);
      val = suffixed + ' ';
    }

    onChange(val);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // On blur, auto-suffix any trailing bare number and normalize
    if (value.trim()) {
      const suffixed = autoSuffixOnSpace(value, value.length);
      const parsed = parseDuration(suffixed);
      const normalized = normalizeDuration(parsed.hours, parsed.minutes, parsed.seconds);
      const formatted = formatDuration(normalized.hours, normalized.minutes, normalized.seconds);
      onChange(formatted);
    }
  };

  return (
    <div className={cn('relative mb-3', className)}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        placeholder="Enter time (ex: 3h 20m)"
        className={cn(
          'w-full rounded-md border-2 bg-transparent px-4 py-3 text-base font-medium text-gray-900',
          'placeholder:text-gray-400 placeholder:font-normal',
          'outline-none transition-colors duration-200',
          'dark:text-white dark:placeholder:text-gray-500',
          isFocused
            ? 'border-blue-500 ring-1 ring-blue-500/20'
            : 'border-gray-200 dark:border-slate-700 hover:border-gray-300',
        )}
        autoComplete="off"
      />
      {/* Clock icon */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <Clock className="h-4 w-4" />
      </div>
      {/* Normalized suggestion dropdown */}
      {isFocused && value.trim() && normalizedDisplay !== value.trim() && (
        <div className="absolute left-0 top-full z-10 mt-1 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300">
          {normalizedDisplay}
        </div>
      )}
    </div>
  );
}

/**
 * Auto-suffix a bare trailing number based on what suffixes already exist.
 * E.g. "2" → "2h", "2h 30" → "2h 30m", "2h 30m 10" → "2h 30m 10s"
 */
function autoSuffixOnSpace(input: string, _cursorPos: number): string {
  const cleaned = input.trim().toLowerCase();
  if (!cleaned) return '';

  // Split into tokens
  const tokens = cleaned.split(/\s+/);
  const result: string[] = [];

  // Track which suffixes have been used
  const usedSuffixes = new Set<string>();

  for (const token of tokens) {
    // Check if it already has a suffix
    if (/\d+[hms]$/.test(token)) {
      result.push(token);
      const suffix = token.slice(-1);
      usedSuffixes.add(suffix);
    } else if (/^\d+$/.test(token)) {
      // Bare number — assign next available suffix
      const num = token;
      if (!usedSuffixes.has('h')) {
        result.push(`${num}h`);
        usedSuffixes.add('h');
      } else if (!usedSuffixes.has('m')) {
        result.push(`${num}m`);
        usedSuffixes.add('m');
      } else if (!usedSuffixes.has('s')) {
        result.push(`${num}s`);
        usedSuffixes.add('s');
      } else {
        // All slots filled, just ignore
        result.push(token);
      }
    } else {
      result.push(token);
    }
  }

  return result.join(' ');
}

// ─── Time Selector (12-hour, scrollable dropdown) ───────────────────────────

/** Generate all time slots for the day in 15-minute intervals */
function generateTimeSlots(): { label: string; hours: number; minutes: number }[] {
  const slots: { label: string; hours: number; minutes: number }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const h12 = h % 12 || 12;
      const ampm = h >= 12 ? 'pm' : 'am';
      const label = `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
      slots.push({ label, hours: h, minutes: m });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

interface TimeSelectorProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}

function TimeSelector({ value, onChange, label }: TimeSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  const hours12 = value.getHours() % 12 || 12;
  const minuteVal = value.getMinutes();
  const isPM = value.getHours() >= 12;
  const displayTime = `${hours12}:${minuteVal.toString().padStart(2, '0')} ${isPM ? 'pm' : 'am'}`;

  // Find the nearest slot index for auto-scroll based on current value
  const currentTotalMin = value.getHours() * 60 + value.getMinutes();
  const nearestSlotIdx = React.useMemo(() => {
    return TIME_SLOTS.reduce((bestIdx, slot, idx) => {
      const slotMin = slot.hours * 60 + slot.minutes;
      const bestMin = TIME_SLOTS[bestIdx]!.hours * 60 + TIME_SLOTS[bestIdx]!.minutes;
      return Math.abs(slotMin - currentTotalMin) < Math.abs(bestMin - currentTotalMin) ? idx : bestIdx;
    }, 0);
  }, [currentTotalMin]);

  // Auto-scroll to nearest slot when popover opens
  // Using double rAF to ensure Radix popover DOM is fully painted
  React.useEffect(() => {
    if (!isOpen) return;

    const scrollToSlot = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!listRef.current) return;
          const items = listRef.current.querySelectorAll('[data-slot-index]');
          if (items.length === 0) return;
          // Measure actual item height from DOM
          const firstItem = items[0] as HTMLElement;
          const itemHeight = firstItem.offsetHeight;
          const containerHeight = listRef.current.clientHeight;
          // Scroll so the nearest slot is centered in the container
          const targetScrollTop = nearestSlotIdx * itemHeight - containerHeight / 2 + itemHeight / 2;
          listRef.current.scrollTop = Math.max(0, targetScrollTop);
        });
      });
    };

    scrollToSlot();
  }, [isOpen, nearestSlotIdx]);

  // Fix: native wheel event listener so scroll works inside Radix popover
  React.useEffect(() => {
    const el = listRef.current;
    if (!el || !isOpen) return;
    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  const handleSelectSlot = (slot: { hours: number; minutes: number }) => {
    const newDate = new Date(value);
    newDate.setHours(slot.hours, slot.minutes, 0, 0);
    onChange(newDate);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'rounded-md px-2 py-1 text-sm font-medium tabular-nums transition-colors',
            'hover:bg-gray-100 dark:hover:bg-slate-800',
            'text-gray-700 dark:text-gray-300',
            isOpen && 'bg-gray-100 ring-1 ring-blue-500 dark:bg-slate-800',
          )}
        >
          {label && <span className="mr-1 text-xs text-gray-500">{label}</span>}
          {displayTime}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[160px] p-0"
        align="start"
        sideOffset={4}
        onWheel={(e) => e.stopPropagation()}
      >
        <div
          ref={listRef}
          className="max-h-[240px] overflow-y-auto py-1"
          style={{ overscrollBehavior: 'contain' }}
        >
          {TIME_SLOTS.map((slot, idx) => {
            const isActive =
              slot.hours === value.getHours() &&
              slot.minutes === value.getMinutes();
            const isNearest = idx === nearestSlotIdx && !isActive;
            return (
              <button
                key={idx}
                type="button"
                data-slot-index={idx}
                onClick={() => handleSelectSlot(slot)}
                className={cn(
                  'flex w-full items-center px-3 py-1.5 text-sm transition-colors',
                  'hover:bg-gray-100 dark:hover:bg-slate-800',
                  isActive && 'bg-blue-50 font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400',
                  isNearest && 'bg-gray-50 dark:bg-slate-900',
                )}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Date & Time Row ────────────────────────────────────────────────────────

interface DateTimeRowProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  startTime: Date;
  onStartTimeChange: (date: Date) => void;
  endTime: Date;
  onEndTimeChange: (date: Date) => void;
}

function DateTimeRow({
  selectedDate,
  onDateChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
}: DateTimeRowProps) {
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const handleDateSelect = (day: Date | undefined) => {
    if (day) {
      // Preserve the time from the current selectedDate
      const newDate = set(day, {
        hours: selectedDate.getHours(),
        minutes: selectedDate.getMinutes(),
        seconds: 0,
        milliseconds: 0,
      });
      onDateChange(newDate);
      setCalendarOpen(false);
    }
  };

  const formattedDate = format(selectedDate, 'EEE, MMM d');

  return (
    <div className="flex items-center gap-1 text-sm mb-2">
      {/* Calendar trigger */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-3 pl-0 px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            <CalendarIcon className="h-4 w-4 text-leadgaze-dark dark:text-white" />
            <span>{formattedDate}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            captionLayout="dropdown"
            fromYear={2000}
            toYear={new Date().getFullYear() + 5}
          />
          <div className="flex items-center justify-between border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date();
                handleDateSelect(today);
              }}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Time range */}
      <div className="flex items-center gap-1">
        <TimeSelector value={startTime} onChange={onStartTimeChange} />
        <span className="text-gray-400">—</span>
        <TimeSelector value={endTime} onChange={onEndTimeChange} />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CustomTimeLog({
  open,
  onOpenChange,
  title = 'Time Log on Task',
  subtitle,
  onSave,
  isSaving = false,
  initialDuration = '',
  initialDate,
  initialDescription = '',
  showCancel = true,
  showSkip = false,
  onSkip,
  skipDisabled = false,
  saveLabel = 'Save',
  headerExtra,
  showActivities = false,
  initialActivities = '',
}: CustomTimeLogProps) {
  const now = new Date();
  const [durationInput, setDurationInput] = React.useState(initialDuration);
  const [selectedDate, setSelectedDate] = React.useState<Date>(initialDate ?? now);
  const [startTime, setStartTime] = React.useState<Date>(now);
  const [endTime, setEndTime] = React.useState<Date>(now);
  const [description, setDescription] = React.useState(initialDescription);
  const [activities, setActivities] = React.useState(initialActivities || '');

  // Track whether the user manually selected a start time (vs auto-calculated)
  const userSelectedStartRef = React.useRef(false);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      const currentNow = new Date();
      setDurationInput(initialDuration);
      setSelectedDate(initialDate ?? currentNow);
      setStartTime(currentNow);
      setEndTime(currentNow);
      setDescription(initialDescription);
      setActivities(initialActivities || '');
      userSelectedStartRef.current = false;
    }
  }, [open, initialDuration, initialDate, initialDescription, initialActivities]);

  // Compute normalized display for the suggestion
  const normalizedDisplay = React.useMemo(() => {
    if (!durationInput.trim()) return '';
    const suffixed = autoSuffixOnSpace(durationInput, durationInput.length);
    const parsed = parseDuration(suffixed);
    const normalized = normalizeDuration(parsed.hours, parsed.minutes, parsed.seconds);
    return formatDuration(normalized.hours, normalized.minutes, normalized.seconds);
  }, [durationInput]);

  // Helper: get total ms from the current duration input
  const getDurationMs = React.useCallback((input: string) => {
    if (!input.trim()) return 0;
    const suffixed = autoSuffixOnSpace(input, input.length);
    const parsed = parseDuration(suffixed);
    const normalized = normalizeDuration(parsed.hours, parsed.minutes, parsed.seconds);
    return (normalized.hours * 3600 + normalized.minutes * 60 + normalized.seconds) * 1000;
  }, []);

  // When duration input changes:
  // - If user has NOT manually selected a start time: endTime = now, startTime = now - duration
  // - If user HAS manually selected a start time: startTime stays, endTime = startTime + duration
  // - If input is cleared: reset both to fresh current time
  React.useEffect(() => {
    const totalMs = getDurationMs(durationInput);

    if (!durationInput.trim()) {
      // Input cleared → reset both times to current time
      const freshNow = new Date();
      setStartTime(freshNow);
      setEndTime(freshNow);
      userSelectedStartRef.current = false;
      return;
    }

    if (totalMs <= 0) return;

    if (userSelectedStartRef.current) {
      // User manually picked a start time → end = start + duration
      setEndTime(new Date(startTime.getTime() + totalMs));
    } else {
      // No manual start selection → end = now, start = now - duration
      const freshNow = new Date();
      setEndTime(freshNow);
      setStartTime(new Date(freshNow.getTime() - totalMs));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationInput]);

  const handleSave = () => {
    const suffixed = autoSuffixOnSpace(durationInput, durationInput.length);
    const parsed = parseDuration(suffixed);
    const normalized = normalizeDuration(parsed.hours, parsed.minutes, parsed.seconds);
    const totalMinutes = normalized.hours * 60 + normalized.minutes + (normalized.seconds > 0 ? 1 : 0);

    // Combine selected date with start time
    const dateWithTime = set(selectedDate, {
      hours: startTime.getHours(),
      minutes: startTime.getMinutes(),
      seconds: 0,
      milliseconds: 0,
    });

    const computedEndTime = new Date(
      dateWithTime.getTime() + totalMinutes * 60 * 1000,
    );

    onSave({
      durationMinutes: totalMinutes,
      dateTime: dateWithTime.toISOString(),
      startTime: dateWithTime,
      endTime: computedEndTime,
      description,
      activities,
    });
  };

  const isDurationValid = React.useMemo(() => {
    if (!durationInput.trim()) return false;
    const suffixed = autoSuffixOnSpace(durationInput, durationInput.length);
    const parsed = parseDuration(suffixed);
    const normalized = normalizeDuration(parsed.hours, parsed.minutes, parsed.seconds);
    return (normalized.hours + normalized.minutes + normalized.seconds) > 0;
  }, [durationInput]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden border-gray-200 p-0 sm:max-w-[480px] bg-white dark:border-slate-800 dark:bg-slate-950">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && (
            <p className="primary-text-regular text-white mt-1">{subtitle}</p>
          )}
          {headerExtra}
        </DialogHeader>

        <div className="space-y-4 px-2 py-3 pt-0">
          {/* Smart Time Input */}
          <SmartTimeInput
            value={durationInput}
            onChange={setDurationInput}
            normalizedDisplay={normalizedDisplay}
          />

          {/* Date & Time Row */}
          <DateTimeRow
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            startTime={startTime}
            onStartTimeChange={(newStart) => {
              userSelectedStartRef.current = true;
              setStartTime(newStart);
              // If duration is set, recalculate end time from new start
              const totalMs = getDurationMs(durationInput);
              if (totalMs > 0) {
                setEndTime(new Date(newStart.getTime() + totalMs));
              } else {
                // No duration set — if end time is now before new start, push end to start
                const startMin = newStart.getHours() * 60 + newStart.getMinutes();
                const endMin = endTime.getHours() * 60 + endTime.getMinutes();
                if (endMin <= startMin) {
                  setEndTime(new Date(newStart));
                }
              }
            }}
            endTime={endTime}
            onEndTimeChange={(newEnd) => {
              userSelectedStartRef.current = true;
              const startMin = startTime.getHours() * 60 + startTime.getMinutes();
              const endMin = newEnd.getHours() * 60 + newEnd.getMinutes();

              // End time cannot be less than or equal to start time
              if (endMin <= startMin) {
                // Snap end time to start time (no negative durations)
                setEndTime(new Date(startTime));
                setDurationInput('');
                return;
              }

              setEndTime(newEnd);

              // Auto-calculate duration from the time difference
              const diffMinutes = endMin - startMin;
              const h = Math.floor(diffMinutes / 60);
              const m = diffMinutes % 60;
              setDurationInput(formatDuration(h, m, 0));
            }}
          />

          {/* Activities */}
          {showActivities && (
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Activities
              </label>
              <Input
                placeholder="Subject"
                value={activities}
                onChange={(e) => setActivities(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <Textarea
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          {showCancel && (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {showSkip && (
            <Button
              variant="outline"
              disabled={skipDisabled}
              onClick={onSkip}
            >
              Skip
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!isDurationValid || isSaving}
          >
            {isSaving ? 'Saving...' : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Utility exports for consumers ──────────────────────────────────────────

export { parseDuration, normalizeDuration, formatDuration, minutesToDisplay };
