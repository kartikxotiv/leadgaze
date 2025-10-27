"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, X, Edit3 } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface InlineEditCellProps {
  value: string | number | undefined;
  type?: "text" | "email" | "phone" | "select" | "score";
  options?: Array<{ id: string; value: string; label?: string }>;
  placeholder?: string;
  className?: string;
  onSave: (newValue: string) => Promise<void>;
  displayValue?: string;
  badge?: boolean;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  badgeClassName?: string;
}

export function InlineEditCell({
  value,
  type = "text",
  options,
  placeholder,
  className = "",
  onSave,
  displayValue,
  badge = false,
  badgeVariant = "outline",
  badgeClassName = "",
}: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ""));
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(String(value || ""));
  }, [value]);

  const handleSave = async () => {
    if (editValue === String(value || "")) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
      toast.success("Updated successfully!");
    } catch (error) {
      toast.error("Failed to update");
      setEditValue(String(value || ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(String(value || ""));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const getDisplayValue = () => {
    if (displayValue) return displayValue;

    if (type === "select" && options) {
      const option = options.find((opt) => opt.id === value);
      return option?.label || option?.value || value || "-";
    }

    if (type === "score") {
      return `${value || 0}/100`;
    }

    return value || "-";
  };

  const renderEditInput = () => {
    if (type === "select" && options) {
      return (
        <Select value={editValue} onValueChange={setEditValue}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label || option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        ref={inputRef}
        type={type === "email" ? "email" : type === "phone" ? "tel" : "text"}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="text-sm !h-[20px]"
        disabled={isLoading}
      />
    );
  };

  const renderDisplayValue = () => {
    const displayVal = getDisplayValue();

    if (badge) {
      return (
        <Badge variant={badgeVariant} className={`text-xs ${badgeClassName}`}>
          {displayVal}
        </Badge>
      );
    }

    return (
      <span className={`${className} ${!value ? "text-muted-foreground" : ""}`}>
        {displayVal}
      </span>
    );
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 min-w-[200px]">
        <div className="flex-1">{renderEditInput()}</div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={handleSave}
            disabled={isLoading}
          >
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={handleCancel}
            disabled={isLoading}
          >
            <X className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-0 py-1 transition-colors"
      onClick={() => setIsEditing(true)}
    >
      {renderDisplayValue()}
      <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export function InlineEditText({
  value,
  onSave,
  placeholder = "Enter text...",
  className = "",
}: {
  value: string | undefined;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}) {
  return (
    <InlineEditCell
      value={value}
      type="text"
      onSave={onSave}
      placeholder={placeholder}
      className={className}
    />
  );
}

export function InlineEditEmail({
  value,
  onSave,
  placeholder = "Enter email...",
}: {
  value: string | undefined;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
}) {
  return (
    <InlineEditCell
      value={value}
      type="email"
      onSave={onSave}
      placeholder={placeholder}
      className="text-blue-600 hover:underline text-[13px] !h-[20px] !rounded-[0px]"
    />
  );
}

export function InlineEditPhone({
  value,
  onSave,
  placeholder = "Enter phone...",
}: {
  value: string | undefined;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
}) {
  return (
    <InlineEditCell
      value={value}
      type="phone"
      onSave={onSave}
      placeholder={placeholder}
    />
  );
}

export function InlineEditSelect({
  value,
  options,
  onSave,
  placeholder = "Select option...",
  badge = true,
  badgeVariant = "outline" as const,
  badgeClassName = "",
}: {
  value: string | undefined;
  options: Array<{ id: string; value: string; label?: string }>;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  badge?: boolean;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  badgeClassName?: string;
}) {
  return (
    <InlineEditCell
      value={value}
      type="select"
      options={options}
      onSave={onSave}
      placeholder={placeholder}
      badge={badge}
      badgeVariant={badgeVariant}
      badgeClassName={badgeClassName}
    />
  );
}

export function InlineEditScore({
  value,
  onSave,
  placeholder = "Enter score...",
}: {
  value: number | undefined;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
}) {
  return (
    <InlineEditCell
      value={value}
      type="score"
      onSave={onSave}
      placeholder={placeholder}
      className="font-medium"
    />
  );
}

export function DirectSelect({
  value,
  options,
  onSave,
  placeholder = "Select...",
  badge = true,
  badgeVariant = "outline" as const,
  badgeClassName = "",
  disabled = false,
}: {
  value: string | undefined;
  options: Array<{ id: string; value: string; label?: string }>;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  badge?: boolean;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  badgeClassName?: string;
  disabled?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const getDisplayValue = () => {
    const option = options.find((opt) => opt.id === value);
    return option?.label || option?.value || placeholder;
  };

  const handleValueChange = async (newValue: string) => {
    if (newValue === value || isLoading) return;

    setIsLoading(true);
    try {
      await onSave(newValue);
      toast.success("Updated successfully!");
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setIsLoading(false);
    }
  };

  const displayValue = getDisplayValue();

  return (
    <Select
      value={value || ""}
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="h-auto min-h-[20px] border-none shadow-none p-0 hover:bg-muted/50 transition-colors group">
        <div className="flex items-center justify-between w-full">
          {badge ? (
            <Badge
              variant={badgeVariant}
              className={`text-xs ${badgeClassName} ${
                isLoading ? "opacity-50" : ""
              }`}
            >
              {displayValue} 
            </Badge>
          ) : (
            <span className={`text-sm ${isLoading ? "opacity-50" : ""}`}>
              {displayValue}
            </span>
          )}
          <ChevronDown className="h-4 w-4 opacity-0 group-hover:opacity-70 transition-opacity ml-1" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label || option.value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DirectScore({
  value,
  onSave,
  placeholder = "Score",
  disabled = false,
}: {
  value: number | undefined;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(String(value || 0));
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setLocalValue(String(value || 0));
  }, [value]);

  const handleSave = async (newValue: string) => {
    const numValue = parseInt(newValue) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));

    if (clampedValue === value) return;

    setIsLoading(true);
    try {
      await onSave(String(clampedValue));
      setLocalValue(String(clampedValue));
      toast.success("Score updated!");
    } catch (error) {
      toast.error("Failed to update score");
      setLocalValue(String(value || 0));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

   
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

   
    timeoutRef.current = setTimeout(() => {
      handleSave(newValue);
    }, 1000);
  };

  const handleBlur = () => {
   
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    handleSave(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      handleSave(localValue);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        min={0}
        max={100}
        className="w-16 h-8 text-center border-none shadow-none p-1 hover:bg-muted/50 focus:bg-background transition-colors"
      />
      <div className="w-12">
        <Progress
          value={Math.min(parseInt(localValue) || 0, 100)}
          className="h-1"
        />
      </div>
    </div>
  );
}

export function DirectText({
  value,
  onSave,
  placeholder = "Enter text...",
  disabled = false,
  className = "",
}: {
  value: string | undefined;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(value || "");
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const handleSave = async (newValue: string) => {
    const trimmedValue = newValue.trim();
    if (trimmedValue === value) return;

    setIsLoading(true);
    try {
      await onSave(trimmedValue);
      toast.success("Updated successfully!");
    } catch (error) {
      toast.error("Failed to update");
      setLocalValue(value || "");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

   
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

   
    timeoutRef.current = setTimeout(() => {
      handleSave(newValue);
    }, 1500);
  };

  const handleBlur = () => {
   
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    handleSave(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      handleSave(localValue);
    }
  };

  return (
    <Input
      type="text"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled || isLoading}
      className={`border-none shadow-none p-1 hover:bg-muted/50 focus:bg-background transition-colors rounded-[2px] ${className} ${
        isLoading ? "opacity-50" : ""
      }`}
    />
  );
}
