"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  label: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string;
  includeTime?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = "Pick a date",
  required = false,
  className,
  error,
  includeTime = false,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [timeValue, setTimeValue] = useState<string>(
    value && includeTime ? format(value, "HH:mm") : "09:00"
  );

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && includeTime) {
      const [hours, minutes] = timeValue.split(":").map(Number);
      selectedDate.setHours(hours, minutes);
    }
    onChange(selectedDate);
  };

  const handleTimeChange = (time: string) => {
    setTimeValue(time);
    if (value) {
      const [hours, minutes] = time.split(":").map(Number);
      const newDate = new Date(value);
      newDate.setHours(hours, minutes);
      onChange(newDate);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>

      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-start text-left font-normal",
                !value && "text-muted-foreground",
                error && "border-red-500"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, "PPP") : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {includeTime && (
          <Input
            type="time"
            value={timeValue}
            onChange={(e) => handleTimeChange(e.target.value)}
            className={cn("w-32", error && "border-red-500")}
          />
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Quick date selection buttons
interface QuickDateSelectProps {
  onDateSelect: (date: Date) => void;
  className?: string;
}

export function QuickDateSelect({
  onDateSelect,
  className,
}: QuickDateSelectProps) {
  const quickOptions = [
    { label: "Today", getDays: () => 0 },
    { label: "Tomorrow", getDays: () => 1 },
    { label: "Next Week", getDays: () => 7 },
    { label: "Next Month", getDays: () => 30 },
  ];

  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      {quickOptions.map((option) => (
        <Button
          key={option.label}
          variant="outline"
          size="sm"
          onClick={() => {
            const date = new Date();
            date.setDate(date.getDate() + option.getDays());
            onDateSelect(date);
          }}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
