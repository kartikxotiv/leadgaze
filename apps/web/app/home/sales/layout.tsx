'use client';

import type React from 'react';

import { ModuleAccessGuardWrapper } from '../_components/module-access-guard-wrapper';

export default function SalesLayout({ children }: React.PropsWithChildren) {
  return (
    <ModuleAccessGuardWrapper moduleKey="sales">
      {children}
    </ModuleAccessGuardWrapper>
  );
}
