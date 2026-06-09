'use client';

import type React from 'react';

import { ModuleAccessGuardWrapper } from '../_components/module-access-guard-wrapper';

export default function InventoryLayout({ children }: React.PropsWithChildren) {
  return (
    <ModuleAccessGuardWrapper moduleKey="inventory">
      {children}
    </ModuleAccessGuardWrapper>
  );
}
