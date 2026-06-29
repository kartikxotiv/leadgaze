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

import type { EntityField } from '~/lib/hooks/use-dynamic-columns';

interface LeadCustomFieldInputsProps {
  fields: EntityField[];
  values: Record<string, unknown>;
  onChange: (fieldKey: string, value: unknown) => void;
  canEdit: (fieldKey: string) => boolean;
}

export function LeadCustomFieldInputs({
  fields,
  values,
  onChange,
  canEdit,
}: LeadCustomFieldInputsProps) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground">Custom Fields</h4>
      {fields.map((field) => {
        if (!canEdit(field.field_key)) return null;

        const value = values[field.field_key];

        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`cf-${field.field_key}`}>
              {field.field_label}
              {field.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {renderInput(field, value, (v) => onChange(field.field_key, v))}
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
        />
      );
    case 'date':
      return (
        <Input
          id={id}
          type="date"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'datetime':
      return (
        <Input
          id={id}
          type="datetime-local"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'single_select': {
      const options = (field.settings?.options as string[]) ?? [];
      return (
        <Select value={strValue} onValueChange={onChange}>
          <SelectTrigger id={id}>
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
        />
      );
  }
}
