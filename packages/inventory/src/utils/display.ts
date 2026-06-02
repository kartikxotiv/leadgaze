export function fallbackInventoryLabel(
  value: string | null | undefined,
  fallback = '-',
) {
  return value || fallback;
}

export function buildInventoryDisplayName(parts: Array<string | null | undefined>) {
  const filteredParts = parts.filter(Boolean);
  return filteredParts.length > 0 ? filteredParts.join(' - ') : '-';
}
