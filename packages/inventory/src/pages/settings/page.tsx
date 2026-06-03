"use client";

import {
  INVENTORY_FEATURE_KEYS,
  INVENTORY_MODULE_KEYS,
  useInventoryPermissions,
} from "../../utils";

function AccessDenied() {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      You do not have permission to view inventory settings.
    </div>
  );
}

export function InventorySettingsPage({ workspaceId }: { workspaceId: string }) {
  const { canAccess, isLoading } = useInventoryPermissions(workspaceId);
  const canManage = canAccess(
    INVENTORY_MODULE_KEYS.inventory,
    INVENTORY_FEATURE_KEYS.manage,
  );

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Checking permissions...
      </div>
    );
  }

  if (!canManage) {
    return <AccessDenied />;
  }

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Workspace: {workspaceId}
      </p>
      <p className="text-sm text-muted-foreground">
        This page scaffold is ready for module implementation.
      </p>
    </section>
  );
}
