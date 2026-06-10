export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${formatNumber(value)}%`;
}

export function formatMonthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(year || 1970, Math.max((month || 1) - 1, 0), 1);

  return date.toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}
