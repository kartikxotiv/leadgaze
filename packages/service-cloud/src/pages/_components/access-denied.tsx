export function ServiceCloudAccessDenied({ label = 'Service Cloud' }: { label?: string }) {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      You do not have permission to view {label}.
    </div>
  );
}
