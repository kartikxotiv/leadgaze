'use client';

import React from 'react';

import { canShowFormField } from '~/lib/field-permission';

interface LeadFormFieldProps {
  formKey: string;
  canEdit: (fieldKey: string) => boolean;
  children: React.ReactNode;
  className?: string;
}

/** Renders children only when the user has edit permission for this form field. */
export function LeadFormField({
  formKey,
  canEdit,
  children,
  className,
}: LeadFormFieldProps) {
  if (!canShowFormField(formKey, canEdit)) return null;
  if (className) return <div className={className}>{children}</div>;
  return <>{children}</>;
}
