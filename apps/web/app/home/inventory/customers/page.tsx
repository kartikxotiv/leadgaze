'use client';

import { InventoryCustomersPage } from '@kit/inventory';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function InventoryCustomersRoute() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <InventoryCustomersPage workspaceId={workspaceId} />;
}
