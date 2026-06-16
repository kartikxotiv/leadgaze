export function entityQuery(workspaceId: string, entityType?: string, entityId?: string) {
  const params = new URLSearchParams({ workspaceId });
  if (entityType) params.set('entityType', entityType);
  if (entityId) params.set('entityId', entityId);
  return params.toString();
}

