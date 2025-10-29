"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BaseFieldProps {
  label: string;
  required?: boolean;
  className?: string;
  error?: string;
}

interface TextFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url";
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  className,
  error,
}: TextFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={label.toLowerCase().replace(/\s+/g, "-")}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={error ? "border-red-500" : ""}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

interface TextareaFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required = false,
  className,
  error,
}: TextareaFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Textarea
        id={label.toLowerCase().replace(/\s+/g, "-")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className={error ? "border-red-500" : ""}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: boolean;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface SelectFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  required = false,
  className,
  error,
}: SelectFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange} required={required}>
        <SelectTrigger className={error ? "border-red-500" : ""}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                {option.icon}
                {option.badge ? (
                  <Badge variant={option.badgeVariant || "default"}>
                    {option.label}
                  </Badge>
                ) : (
                  option.label
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

interface PrioritySelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  error?: string;
}

export function PrioritySelect({
  value,
  onChange,
  required = false,
  className,
  error,
}: PrioritySelectProps) {
  const priorityOptions: SelectOption[] = [
    {
      value: "low",
      label: "Low",
      icon: <div className="w-2 h-2 rounded-full bg-gray-400" />,
    },
    {
      value: "medium",
      label: "Medium",
      icon: <div className="w-2 h-2 rounded-full bg-yellow-400" />,
    },
    {
      value: "high",
      label: "High",
      icon: <div className="w-2 h-2 rounded-full bg-orange-400" />,
    },
    {
      value: "urgent",
      label: "Urgent",
      icon: <div className="w-2 h-2 rounded-full bg-red-500" />,
    },
  ];

  return (
    <SelectField
      label="Priority"
      value={value}
      onChange={onChange}
      options={priorityOptions}
      required={required}
      className={className}
      error={error}
    />
  );
}

interface NumberFieldProps extends BaseFieldProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  min,
  max,
  step,
  required = false,
  className,
  error,
}: NumberFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={label.toLowerCase().replace(/\s+/g, "-")}
        type="number"
        value={value || ""}
        onChange={(e) =>
          onChange(e.target.value ? parseInt(e.target.value) : undefined)
        }
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        required={required}
        className={error ? "border-red-500" : ""}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
