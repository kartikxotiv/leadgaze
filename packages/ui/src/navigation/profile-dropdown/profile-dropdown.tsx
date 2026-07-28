'use client';

import type { ReactNode } from 'react';

export interface ProfileDropdownProps {
  children?: ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
  className?: string;
}

export function ProfileDropdown({
  children,
  className,
}: ProfileDropdownProps) {
  return <div className={className}>{children}</div>;
}
