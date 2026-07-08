'use client';

import * as React from 'react';

import { format, isAfter, isBefore, isValid, set, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

import { cn } from '../lib/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { ScrollArea } from './scroll-area';

interface DateTimePickerProps {
  value?: Date;
  onChange?: (date?: Date) => void;
  mode?: 'date' | 'datetime' | 'time';
  showTime?: boolean;
  hourFormat?: 12 | 24;
  minuteStep?: 1 | 5 | 10 | 15 | 30;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: (date: Date) => boolean;
  className?: string;
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
      if (actualMode === 'date') {
        onChange?.(newDate);
        setIsOpen(false);
      } else {
        onChange?.(newDate);
      }
    } else {
      setDate(undefined);
      onChange?.(undefined);
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
    onChange?.(newDate);
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className,
          )}
          disabled={disabled}
        >
          {actualMode === 'time' ? (
            <Clock className="mr-2 h-4 w-4 shrink-0" />
          ) : (
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          )}
          <span className="truncate">{formatDisplay()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          {(actualMode === 'date' || actualMode === 'datetime') && (
            <div className="border-b p-3 sm:border-r sm:border-b-0">
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
                  maxDate ? maxDate.getFullYear() : new Date().getFullYear() + 50
                }
              />
            </div>
          )}
          {(actualMode === 'time' || actualMode === 'datetime') && (
            <div className="flex gap-2 p-3">
              <ScrollArea className="h-[280px] w-16">
                <div className="flex flex-col gap-1 pr-3">
                  {hours.map((h) => {
                    const currentHour = date ? date.getHours() : 0;
                    let isSelected = false;
                    if (hourFormat === 12) {
                      const displayH = currentHour % 12 || 12;
                      isSelected = displayH.toString().padStart(2, '0') === h;
                    } else {
                      isSelected =
                        currentHour.toString().padStart(2, '0') === h;
                    }
                    return (
                      <Button
                        key={h}
                        variant={isSelected ? 'default' : 'ghost'}
                        size="sm"
                        className="w-full px-1 text-center"
                        onClick={() => handleTimeChange('hour', h)}
                        disabled={!date}
                      >
                        {h}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
              <ScrollArea className="h-[280px] w-16">
                <div className="flex flex-col gap-1 pr-3">
                  {minutes.map((m) => {
                    const currentMinute = date ? date.getMinutes() : 0;
                    const isSelected =
                      currentMinute.toString().padStart(2, '0') === m;
                    return (
                      <Button
                        key={m}
                        variant={isSelected ? 'default' : 'ghost'}
                        size="sm"
                        className="w-full px-1 text-center"
                        onClick={() => handleTimeChange('minute', m)}
                        disabled={!date}
                      >
                        {m}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
              {hourFormat === 12 && (
                <div className="flex h-[280px] flex-col gap-1 overflow-hidden">
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
      </PopoverContent>
    </Popover>
  );
}
