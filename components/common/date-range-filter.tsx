"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DateRange as DateRangeType } from "react-day-picker";

export type DateRangePreset =
  | "all"
  | "last_2_days"
  | "last_7_days"
  | "last_30_days"
  | "last_month"
  | "last_3_months"
  | "custom";

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface DateRangeFilterProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  onClear?: () => void;
  className?: string;
  placeholder?: string;
}

const PRESET_OPTIONS: Array<{ value: DateRangePreset; label: string }> = [
  { value: "all", label: "All Time" },
  { value: "last_2_days", label: "Last 2 Days" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
];

function getPresetRange(preset: DateRangePreset): DateRange | null {
  const now = new Date();
  const todayEnd = endOfDay(now);

  switch (preset) {
    case "all":
      return null;
    case "last_2_days":
      return {
        from: startOfDay(subDays(now, 2)),
        to: todayEnd,
      };
    case "last_7_days":
      return {
        from: startOfDay(subDays(now, 7)),
        to: todayEnd,
      };
    case "last_30_days":
      return {
        from: startOfDay(subDays(now, 30)),
        to: todayEnd,
      };
    case "last_month": {
      const firstDayOfLastMonth = startOfMonth(subMonths(now, 1));
      const lastDayOfLastMonth = endOfMonth(subMonths(now, 1));
      return {
        from: firstDayOfLastMonth,
        to: lastDayOfLastMonth,
      };
    }
    case "last_3_months":
      return {
        from: startOfDay(subDays(now, 90)),
        to: todayEnd,
      };
    case "custom":
      return { from: null, to: null };
    default:
      return null;
  }
}

export function DateRangeFilter({
  value,
  onChange,
  onClear,
  className,
  placeholder = "Select date range",
}: DateRangeFilterProps) {
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>("all");
  const [isCustomPopoverOpen, setIsCustomPopoverOpen] = useState(false);
  // Temporary state for date selection before applying
  const [tempDateRange, setTempDateRange] = useState<DateRangeType | undefined>(
    value?.from && value?.to ? { from: value.from, to: value.to } : undefined
  );

  // Update temp state when value changes externally
  useEffect(() => {
    if (value?.from && value?.to) {
      setTempDateRange({ from: value.from, to: value.to });
    } else {
      setTempDateRange(undefined);
    }
  }, [value]);

  // Detect preset from current value
  useEffect(() => {
    if (!value || (!value.from && !value.to)) {
      setSelectedPreset("all");
      return;
    }

    // Check if current range matches any preset
    const now = new Date();
    const todayEnd = endOfDay(now);

    if (value.from && value.to) {
      const fromTime = value.from.getTime();
      const toTime = value.to.getTime();

      // Check last 2 days
      const last2Days = {
        from: startOfDay(subDays(now, 2)).getTime(),
        to: todayEnd.getTime(),
      };
      if (fromTime === last2Days.from && toTime === last2Days.to) {
        setSelectedPreset("last_2_days");
        return;
      }

      // Check last 7 days
      const last7Days = {
        from: startOfDay(subDays(now, 7)).getTime(),
        to: todayEnd.getTime(),
      };
      if (fromTime === last7Days.from && toTime === last7Days.to) {
        setSelectedPreset("last_7_days");
        return;
      }

      // Check last 30 days
      const last30Days = {
        from: startOfDay(subDays(now, 30)).getTime(),
        to: todayEnd.getTime(),
      };
      if (fromTime === last30Days.from && toTime === last30Days.to) {
        setSelectedPreset("last_30_days");
        return;
      }

      // Check last month
      const firstDayOfLastMonth = startOfMonth(subMonths(now, 1)).getTime();
      const lastDayOfLastMonth = endOfMonth(subMonths(now, 1)).getTime();
      if (fromTime === firstDayOfLastMonth && toTime === lastDayOfLastMonth) {
        setSelectedPreset("last_month");
        return;
      }

      // Check last 3 months
      const last3Months = {
        from: startOfDay(subDays(now, 90)).getTime(),
        to: todayEnd.getTime(),
      };
      if (fromTime === last3Months.from && toTime === last3Months.to) {
        setSelectedPreset("last_3_months");
        return;
      }
    }

    // If no preset matches, it's custom
    setSelectedPreset("custom");
  }, [value]);

  const handlePresetChange = useCallback(
    (preset: DateRangePreset) => {
      setSelectedPreset(preset);
      if (preset === "custom") {
        // Open popover when custom is selected
        setIsCustomPopoverOpen(true);
        // Initialize temp range with current value or empty
        if (value?.from && value?.to) {
          setTempDateRange({ from: value.from, to: value.to });
        } else {
          setTempDateRange(undefined);
        }
      } else {
        setIsCustomPopoverOpen(false);
        const range = getPresetRange(preset);
        onChange(range);
      }
    },
    [onChange, value]
  );

  const handleDateRangeSelect = useCallback(
    (range: DateRangeType | undefined) => {
      if (range) {
        setTempDateRange(range);
      } else {
        setTempDateRange(undefined);
      }
    },
    []
  );

  const handleApply = useCallback(
    (e?: React.MouseEvent<HTMLButtonElement>) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (
        tempDateRange?.from &&
        tempDateRange?.to &&
        tempDateRange.from instanceof Date &&
        tempDateRange.to instanceof Date &&
        !isNaN(tempDateRange.from.getTime()) &&
        !isNaN(tempDateRange.to.getTime())
      ) {
        onChange({
          from: startOfDay(tempDateRange.from),
          to: endOfDay(tempDateRange.to),
        });
        setIsCustomPopoverOpen(false);
      }
    },
    [tempDateRange, onChange]
  );

  const handleClearCustom = useCallback(() => {
    setTempDateRange(undefined);
    onChange(null);
    setIsCustomPopoverOpen(false);
    onClear?.();
  }, [onChange, onClear]);

  const handleClear = useCallback(() => {
    onChange(null);
    onClear?.();
  }, [onChange, onClear]);

  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return "";
    return format(date, "MMM d, yyyy");
  };

  const handleFromInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (!inputValue) {
      setTempDateRange((prev) => ({
        from: undefined,
        to: prev?.to,
      }));
      return;
    }
    // Try to parse the date
    const parsedDate = new Date(inputValue);
    if (!isNaN(parsedDate.getTime())) {
      setTempDateRange((prev) => ({
        from: parsedDate,
        to: prev?.to,
      }));
    }
  };

  const handleToInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (!inputValue) {
      setTempDateRange((prev) => ({
        from: prev?.from,
        to: undefined,
      }));
      return;
    }
    // Try to parse the date
    const parsedDate = new Date(inputValue);
    if (!isNaN(parsedDate.getTime())) {
      setTempDateRange((prev) => ({
        from: prev?.from,
        to: parsedDate,
      }));
    }
  };

  const canApply =
    tempDateRange?.from &&
    tempDateRange?.to &&
    tempDateRange.from instanceof Date &&
    tempDateRange.to instanceof Date &&
    !isNaN(tempDateRange.from.getTime()) &&
    !isNaN(tempDateRange.to.getTime());

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isCustomPopoverOpen} onOpenChange={setIsCustomPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            onClick={() => {
              // When button is clicked, open popover
              setIsCustomPopoverOpen(true);
              // Initialize temp range with current value or empty
              if (value?.from && value?.to) {
                setTempDateRange({ from: value.from, to: value.to });
              } else {
                setTempDateRange(undefined);
              }
            }}
            className={cn(
              "w-[240px] justify-start text-left font-normal h-9 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors",
              value?.from && value?.to
                ? "text-foreground border-primary/20"
                : "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {value?.from && value?.to
                ? `${format(value.from, "MMM d, yyyy")} - ${format(
                    value.to,
                    "MMM d, yyyy"
                  )}`
                : "Select date range"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4 space-y-4 relative">
            {/* Header */}
            {/* <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Date</span>
                <Select defaultValue="is_in_between">
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="is_in_between">Is in between</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearCustom}
                className="h-8 text-sm text-muted-foreground hover:text-foreground"
              >
                Delete
              </Button>
            </div> */}

            {/* Date Input Fields */}
            {/* <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Select Starting date..."
                  value={formatDateForInput(tempDateRange?.from)}
                  onChange={handleFromInputChange}
                  className="pr-8"
                />
                {tempDateRange?.from && (
                  <button
                    type="button"
                    onClick={() =>
                      setTempDateRange((prev) => ({
                        from: undefined,
                        to: prev?.to,
                      }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Select Ending date..."
                  value={formatDateForInput(tempDateRange?.to)}
                  onChange={handleToInputChange}
                  className="pr-8"
                />
                {tempDateRange?.to && (
                  <button
                    type="button"
                    onClick={() =>
                      setTempDateRange((prev) => ({
                        from: prev?.from,
                        to: undefined,
                      }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div> */}

            {/* Calendar */}
            <Calendar
              mode="range"
              selected={tempDateRange}
              onSelect={handleDateRangeSelect}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date > today;
              }}
              numberOfMonths={2}
              className="rounded-md border-0 p-0"
              classNames={{
                months: "flex flex-row gap-8 customcalenderrange",
                month: "space-y-3",
                caption: "flex justify-center pt-2 pb-3 relative items-center",
                caption_label: "text-sm font-semibold text-foreground",
                nav_button_previous: "absolute left-0",
                nav_button_next: "absolute right-0",
                head_row: "flex mb-3",
                head_cell:
                  "text-muted-foreground w-10 font-semibold text-xs uppercase tracking-wider text-center",
                day: "h-10 w-10 rounded-md text-center text-sm",
                day_range_middle: "!bg-primary/20 !text-primary-foreground",
                day_selected: "!bg-primary !text-primary-foreground rounded-md",
                nav_button: "common-nav",
                week_number: "text-muted-foreground text-xs",
                day_disabled:
                  "text-muted-foreground opacity-30 cursor-not-allowed",

                // day_range_middle: "bg-primary text-primary-foreground",
              }}
            />

            {/* Apply Button */}
            {canApply && (
              <div className="flex justify-end pt-2 border-t">
                <Button
                  onClick={handleApply}
                  size="sm"
                  className="w-full"
                  type="button"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {value && (value.from || value.to) && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="h-9 w-9"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
