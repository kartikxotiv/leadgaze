"use client";

import * as React from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { COUNTRIES } from "@/lib/constants/countries";

interface CountrySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

export function CountrySelect({
  value,
  onValueChange,
  placeholder = "Select country...",
  className,
  disabled = false,
  error = false,
}: CountrySelectProps) {
  const selectedCountry = React.useMemo(
    () => COUNTRIES.find((country) => country.value === value),
    [value]
  );

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2 z-10" />
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          className={cn(
            "bg-gray-100 pl-10 pr-10",
            error && "border-red-500 focus:border-red-500",
            className
          )}
        >
          <SelectValue placeholder={placeholder}>
            {selectedCountry ? selectedCountry.label : placeholder}
          </SelectValue>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          <div className="max-h-[280px] overflow-y-auto">
            {COUNTRIES.map((country) => (
              <SelectItem
                key={country.value}
                value={country.value}
                className="hover:bg-gray-200 hover:text-black"
              >
                {country.label}
              </SelectItem>
            ))}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
