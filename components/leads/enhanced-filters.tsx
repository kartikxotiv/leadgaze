"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Plus,
  CheckCircle2,
  Target,
  Star,
  Users,
  Calendar,
  SortAsc,
  SortDesc,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  id: string;
  value: string;
  label: string;
  count?: number;
  color?: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  options: FilterOption[];
  multiple?: boolean;
  searchable?: boolean;
}

export interface ActiveFilter {
  filterId: string;
  filterLabel: string;
  values: string[];
  valueLabels: string[];
}

export interface EnhancedFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: FilterConfig[];
  activeFilters: ActiveFilter[];
  onFilterChange: (filterId: string, values: string[]) => void;
  onClearFilters: () => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (sortBy: string, sortOrder: "asc" | "desc") => void;
  className?: string;
  resultCount?: number;
  totalCount?: number;
}

const FilterDropdown = ({
  filter,
  activeValues,
  onValueChange,
}: {
  filter: FilterConfig;
  activeValues: string[];
  onValueChange: (values: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = filter.searchable
    ? filter.options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filter.options;

  const handleValueToggle = (value: string) => {
    if (filter.multiple) {
      const newValues = activeValues.includes(value)
        ? activeValues.filter((v) => v !== value)
        : [...activeValues, value];
      onValueChange(newValues);
    } else {
      onValueChange(activeValues.includes(value) ? [] : [value]);
      setOpen(false);
    }
  };

  const getDisplayText = () => {
    if (activeValues.length === 0) return filter.label;
    if (activeValues.length === 1) {
      const option = filter.options.find((opt) => opt.id === activeValues[0]);
      return option?.label || filter.label;
    }
    return `${filter.label} (${activeValues.length})`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-between transition-colors",
            activeValues.length > 0 &&
              "border-primary/50 bg-primary/10 text-primary"
          )}
        >
          <div className="flex items-center gap-2">
            {filter.icon}
            <span className="text-sm">{getDisplayText()}</span>
          </div>
          <div className="flex items-center gap-1">
            {activeValues.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-xs">
                {activeValues.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          {filter.searchable && (
            <>
              <CommandInput
                placeholder={`Search ${filter.label.toLowerCase()}...`}
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandSeparator />
            </>
          )}
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.id}
                  onSelect={() => handleValueToggle(option.id)}
                  className="flex items-center gap-3 py-2"
                >
                  {filter.multiple ? (
                    <Checkbox
                      checked={activeValues.includes(option.id)}
                      onChange={() => handleValueToggle(option.id)}
                    />
                  ) : (
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2",
                        activeValues.includes(option.id)
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      )}
                    />
                  )}

                  <div className="flex items-center gap-2 flex-1">
                    {option.color && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className="text-sm">{option.label}</span>
                  </div>

                  {option.count !== undefined && (
                    <Badge variant="secondary" className="h-4 px-1 text-xs">
                      {option.count}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const SortDropdown = ({
  sortBy,
  sortOrder,
  onSortChange,
}: {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (sortBy: string, sortOrder: "asc" | "desc") => void;
}) => {
  const [open, setOpen] = useState(false);

  const sortOptions = [
    { id: "name", label: "Name" },
    { id: "company", label: "Company" },
    { id: "score", label: "Lead Score" },
    { id: "created", label: "Date Created" },
    { id: "updated", label: "Last Updated" },
  ];

  const handleSortSelect = (newSortBy: string) => {
    if (!onSortChange) return;

    if (sortBy === newSortBy) {
      // Toggle sort order
      onSortChange(newSortBy, sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New sort field, default to ascending
      onSortChange(newSortBy, "asc");
    }
    setOpen(false);
  };

  const getCurrentSortLabel = () => {
    if (!sortBy) return "Sort by";
    const option = sortOptions.find((opt) => opt.id === sortBy);
    const orderText = sortOrder === "desc" ? "↓" : "↑";
    return `${option?.label} ${orderText}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 justify-between">
          <div className="flex items-center gap-2">
            {sortOrder === "desc" ? (
              <SortDesc className="h-4 w-4" />
            ) : (
              <SortAsc className="h-4 w-4" />
            )}
            <span className="text-sm">{getCurrentSortLabel()}</span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {sortOptions.map((option) => (
                <CommandItem
                  key={option.id}
                  onSelect={() => handleSortSelect(option.id)}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm">{option.label}</span>
                  {sortBy === option.id && (
                    <div className="flex items-center gap-1">
                      {sortOrder === "desc" ? (
                        <SortDesc className="h-3 w-3" />
                      ) : (
                        <SortAsc className="h-3 w-3" />
                      )}
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export function EnhancedFilters({
  searchValue,
  onSearchChange,
  filters,
  activeFilters,
  onFilterChange,
  onClearFilters,
  sortBy,
  sortOrder,
  onSortChange,
  className = "",
  resultCount,
  totalCount,
}: EnhancedFiltersProps) {
  const hasActiveFilters = activeFilters.some((f) => f.values.length > 0);

  const removeFilter = (filterId: string, value?: string) => {
    const activeFilter = activeFilters.find((f) => f.filterId === filterId);
    if (!activeFilter) return;

    if (value) {
      // Remove specific value
      const newValues = activeFilter.values.filter((v) => v !== value);
      onFilterChange(filterId, newValues);
    } else {
      // Remove entire filter
      onFilterChange(filterId, []);
    }
  };

  return (
    <Card className={cn(className)}>
      <CardContent className="px-0 py-0 space-y-4">
      {/* <CardContent className=""> */}
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, email"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10"
          />
        </div>

        {/* Filters Row */}
        {/* <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filter by:</span>
          </div>

          
          {filters.map((filter) => {
            const activeFilter = activeFilters.find(
              (f) => f.filterId === filter.id
            );
            return (
              <FilterDropdown
                key={filter.id}
                filter={filter}
                activeValues={activeFilter?.values || []}
                onValueChange={(values) => onFilterChange(filter.id, values)}
              />
            );
          })}

          
          {onSortChange && (
            <SortDropdown
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
          )}

          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Clear filters
            </Button>
          )}
        </div> */}

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              Active filters:
            </span>
            {activeFilters.map((activeFilter) =>
              activeFilter.values.map((value, index) => {
                const filter = filters.find(
                  (f) => f.id === activeFilter.filterId
                );
                const option = filter?.options.find((opt) => opt.id === value);

                return (
                  <Badge
                    key={`${activeFilter.filterId}-${value}`}
                    variant="secondary"
                    className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    {filter?.icon}
                    <span className="text-xs">
                      {activeFilter.filterLabel}: {option?.label || value}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-3 w-3 p-0 hover:bg-blue-300"
                      onClick={() => removeFilter(activeFilter.filterId, value)}
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                );
              })
            )}
          </div>
        )}

        {/* Results Count */}
        
        {/* {(resultCount !== undefined || totalCount !== undefined) && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              {resultCount !== undefined && totalCount !== undefined ? (
                <span>
                  Showing {resultCount} of {totalCount} leads
                  {hasActiveFilters && " (filtered)"}
                </span>
              ) : resultCount !== undefined ? (
                <span>{resultCount} leads found</span>
              ) : (
                <span>{totalCount} total leads</span>
              )}
            </div>
          </div>
        )} */}



      </CardContent>
    </Card>
  );
}
