import * as React from 'react';

import { cn } from '../lib/utils';
import { Input } from './input';
import { Textarea } from './textarea';

type EditablePrimitive = string | number | null | undefined;

export interface InlineEditableValueProps
  extends Omit<
    React.ComponentPropsWithRef<'input'>,
    'value' | 'defaultValue' | 'onChange' | 'onBlur'
  > {
  value: EditablePrimitive;
  onCommit?: (value: string) => void | Promise<void>;
  multiline?: boolean;
  rows?: number;
  className?: string;
  displayClassName?: string;
  inputClassName?: string;
  placeholder?: string;
  renderDisplay?: (value: string) => React.ReactNode;
}

/**
 * Inline editable value
 *
 * Renders as plain text until the user clicks the value.
 * The value is only committed when the field loses focus.
 */
export function InlineEditableValue({
  value,
  onCommit,
  multiline = false,
  rows = 3,
  className,
  displayClassName,
  inputClassName,
  placeholder = 'Click to edit',
  disabled,
  renderDisplay,
  ...inputProps
}: InlineEditableValueProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(normalizeValue(value));
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isEditing) {
      setDraft(normalizeValue(value));
    }
  }, [value, isEditing]);

  const commitChanges = React.useCallback(async () => {
    const nextValue = draft;
    const currentValue = normalizeValue(value);

    setIsEditing(false);

    if (nextValue === currentValue) {
      return;
    }

    if (!onCommit) {
      return;
    }

    setIsSaving(true);

    try {
      await onCommit(nextValue);
    } finally {
      setIsSaving(false);
    }
  }, [draft, onCommit, value]);

  const handleCancel = React.useCallback(() => {
    setDraft(normalizeValue(value));
    setIsEditing(false);
  }, [value]);

  if (isEditing) {
    return multiline ? (
      <Textarea
        {...(inputProps as React.ComponentPropsWithoutRef<typeof Textarea>)}
        rows={rows}
        autoFocus
        disabled={disabled || isSaving}
        className={cn(
          'w-full min-h-[34px] resize-y text-right py-1.5 px-2 border-black/20 dark:border-white/20 focus-visible:border-gray-200 dark:focus-visible:border-gray-600 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
          inputClassName
        )}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onBlur={() => {
          void commitChanges();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            handleCancel();
          }
        }}
        aria-busy={isSaving || undefined}
      />
    ) : (
      <Input
        {...inputProps}
        autoFocus
        disabled={disabled || isSaving}
        className={cn(
          'w-full text-right h-8 py-1 px-2 border-black/20 dark:border-white/20 focus-visible:border-gray-200 dark:focus-visible:border-gray-600 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
          inputClassName
        )}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onBlur={() => {
          void commitChanges();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            handleCancel();
            return;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        aria-busy={isSaving || undefined}
      />
    );
  }

  const displayValue = normalizeValue(value);
  const isEmpty = displayValue.length === 0;

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'group inline-flex w-full min-h-[34px] py-1 px-2 items-center justify-start rounded-[4px] text-left outline-none transition-colors',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        {
          'cursor-text': !disabled,
          'text-muted-foreground': isEmpty,
          'hover:bg-accent/20': !disabled,
        },
        className,
      )}
      onClick={() => {
        if (!disabled) {
          setDraft(displayValue);
          setIsEditing(true);
        }
      }}
      onKeyDown={(event) => {
        if (disabled) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setDraft(displayValue);
          setIsEditing(true);
        }
      }}
    >
      {renderDisplay ? (
        renderDisplay(displayValue)
      ) : (
        <span
          className={cn(
            'block w-full rounded-[4px] px-0 py-0 text-right text-inherit',
            'transition-colors group-hover:text-foreground',
            displayClassName,
          )}
        >
          {isEmpty ? placeholder : displayValue}
        </span>
      )}
    </button>
  );
}

function normalizeValue(value: EditablePrimitive) {
  if (value === null || value === undefined) return '';

  return String(value);
}
