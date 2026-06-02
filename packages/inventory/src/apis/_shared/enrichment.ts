type InventoryRow = Record<string, unknown>;

function normalizeRows<T>(data: T | T[] | null | undefined) {
  if (Array.isArray(data)) {
    return data as InventoryRow[];
  }

  return data ? [data as InventoryRow] : [];
}

export async function enrichInventoryData<T>(
  _supabase: unknown,
  _workspaceId: string,
  data: T | T[] | null | undefined,
): Promise<T | T[] | null | undefined> {
  const rows = normalizeRows(data);

  if (rows.length === 0) {
    return data;
  }

  return data;
}
