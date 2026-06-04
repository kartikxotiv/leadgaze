'use client';

import type { RecruitmentOptionsResponse } from '../../types/recruitment.type';

export function toDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

export function toDateTimeInputValue(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export type BaseDialogProps = {
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  options: RecruitmentOptionsResponse;
};
