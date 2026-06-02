"use client";

import {
  INVENTORY_FEATURE_KEYS,
  INVENTORY_MODULE_KEYS,
  useInventoryPermissions,
} from "../../utils";

function AccessDenied() {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      You do not have permission to view purchases.
    </div>
  );
}

export function InventoryPurchasesPage({ workspaceId }: { workspaceId: string }) {
  const { canAccess, isLoading } = useInventoryPermissions(workspaceId);
  const canView = canAccess(
    INVENTORY_MODULE_KEYS.purchases,
    INVENTORY_FEATURE_KEYS.view,
  );

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Checking permissions...
      </div>
    );
  }

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">Purchases</h1>
      <p className="text-sm text-muted-foreground">
        Workspace: {workspaceId}
      </p>
      <p className="text-sm text-muted-foreground">
        This page scaffold is ready for module implementation.
      </p>
    </section>
  );
}
