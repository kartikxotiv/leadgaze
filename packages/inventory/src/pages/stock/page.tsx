'use client';

export function InventoryStockPage({ workspaceId }: { workspaceId: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">Stock</h1>
      <p className="text-sm text-muted-foreground">
        Workspace: {workspaceId}
      </p>
      <p className="text-sm text-muted-foreground">
        This page scaffold is ready for module implementation.
      </p>
    </section>
  );
}
