'use client';

import { InventoryVendorsPage } from '@kit/inventory';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function InventoryVendorsRoute() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <InventoryVendorsPage workspaceId={workspaceId} />;
}
