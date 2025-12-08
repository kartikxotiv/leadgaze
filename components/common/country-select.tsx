"use client";

import * as React from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [open, setOpen] = React.useState(false);

  const selectedCountry = React.useMemo(
    () => COUNTRIES.find((country) => country.value === value),
    [value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-gray-100 hover:bg-gray-100 h-10",
            error && "border-red-500 focus:border-red-500",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className={cn(!selectedCountry && "text-muted-foreground")}>
              {selectedCountry ? selectedCountry.label : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup className="!overflow-visible">
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country.value}
                  value={`${country.label} ${country.code}`}
                  onSelect={() => {
                    onValueChange(country.value);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1">{country.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
