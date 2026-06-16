"use client";

import { Search } from 'lucide-react';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';

type SearchToggleProps = {
  value: string;
  isVisible: boolean;
  onValueChange: (value: string) => void;
  onVisibilityChange: (visible: boolean) => void;
  placeholder?: string;
  inputClassName?: string;
};

export function SearchToggle({
  value,
  isVisible,
  onValueChange,
  onVisibilityChange,
  placeholder = 'Search...',
  inputClassName = 'h-9 w-[200px] pl-9 sm:w-[300px]',
}: SearchToggleProps) {
  if (isVisible) {
    return (
      <div className="relative animate-in fade-in slide-in-from-right-2 duration-300">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          autoFocus
          className={inputClassName}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onBlur={() => {
            if (!value) {
              onVisibilityChange(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !value) {
              onVisibilityChange(false);
            }
          }}
        />
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => onVisibilityChange(true)}
    >
      <Search className="h-4 w-4" />
    </Button>
  );
}
