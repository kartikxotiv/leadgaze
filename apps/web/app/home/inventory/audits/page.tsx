'use client';

import { InventoryAuditsPage } from '@kit/inventory';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function InventoryAuditsRoute() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <InventoryAuditsPage workspaceId={workspaceId} />;
}
