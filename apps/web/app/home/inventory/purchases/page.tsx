'use client';

import { InventoryPurchasesPage } from '@kit/inventory';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function InventoryPurchasesRoute() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <InventoryPurchasesPage workspaceId={workspaceId} />;
}
