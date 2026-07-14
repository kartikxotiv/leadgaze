'use client';

import React from 'react';

import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Switch } from '@kit/ui/switch';
import { Textarea } from '@kit/ui/textarea';
import { DateTimePicker } from '@kit/ui/datetime-picker';
import { format } from 'date-fns';

import type { EntityField } from '~/lib/hooks/use-dynamic-columns';

interface LeadCustomFieldInputsProps {
  fields: EntityField[];
  values: Record<string, unknown>;
  onChange: (fieldKey: string, value: unknown) => void;
  canEdit: (fieldKey: string) => boolean;
  canView?: (fieldKey: string) => boolean;
}

export function LeadCustomFieldInputs({
  fields,
  values,
  onChange,
  canEdit,
  canView = () => true,
}: LeadCustomFieldInputsProps) {
  // Filter out fields that user doesn't have view permission for
  const visibleFields = fields.filter((field) => canView(field.field_key));

  if (visibleFields.length === 0) return null;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">Custom Fields</h4>
      {visibleFields.map((field) => {
        const isEditable = canEdit(field.field_key);
        const value = values[field.field_key];

        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`cf-${field.field_key}`} className={!isEditable ? 'opacity-60' : ''}>
              {field.field_label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
              {!isEditable && (
                <span className="ml-1.5 text-xs text-muted-foreground font-normal">(view only)</span>
              )}
            </Label>
            {renderInput(field, value, (v) => onChange(field.field_key, v), !isEditable)}
          </div>
        );
      })}
    </div>
  );
}

function renderInput(
  field: EntityField,
  value: unknown,
  onChange: (value: unknown) => void,
  disabled = false,
) {
  const id = `cf-${field.field_key}`;
  const strValue = value == null ? '' : String(value);

  switch (field.field_type) {
    case 'textarea':
      return (
        <Textarea
          id={id}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          disabled={disabled}
          readOnly={disabled}
          className={disabled ? 'opacity-60 cursor-not-allowed' : ''}
        />
      );
    case 'boolean':
      return (
        <Switch
          id={id}
          checked={Boolean(value)}
          onCheckedChange={onChange}
        />
      );
    case 'number':
    case 'decimal':
    case 'currency':
    case 'rating':
      return (
        <Input
          id={id}
          type="number"
          value={strValue}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled}
          readOnly={disabled}
          className={disabled ? 'opacity-60 cursor-not-allowed' : ''}
        />
      );
    case 'date':
      return (
        <DateTimePicker
          mode="date"
          placeholder="Select date"
          value={strValue ? new Date(strValue) : undefined}
          onChange={(date) => onChange(date ? format(date, 'yyyy-MM-dd') : '')}
          disabled={disabled}
          className={disabled ? 'opacity-60 cursor-not-allowed' : ''}
        />
      );
    case 'datetime':
      return (
        <DateTimePicker
          showTime
          value={strValue ? new Date(strValue) : undefined}
          onChange={(date) => onChange(date ? format(date, "yyyy-MM-dd'T'HH:mm") : '')}
          disabled={disabled}
          className={disabled ? 'opacity-60 cursor-not-allowed' : ''}
        />
      );
    case 'single_select': {
      const options = (field.settings?.options as string[]) ?? [];
      return (
        <Select value={strValue} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={id} className={disabled ? 'opacity-60 cursor-not-allowed' : ''}>
            <SelectValue placeholder={`Select ${field.field_label}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    default:
      return (
        <Input
          id={id}
          type={field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : 'text'}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          readOnly={disabled}
          className={disabled ? 'opacity-60 cursor-not-allowed' : ''}
        />
      );
  }
}
