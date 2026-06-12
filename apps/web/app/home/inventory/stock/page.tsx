'use client';

import { InventoryStockPage } from '@kit/inventory';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function InventoryStockRoute() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <InventoryStockPage workspaceId={workspaceId} />;
}
