export function formatCurrency(value?: number | null, currency = 'INR') {
  if (value === null || value === undefined) {
    return '-';
  }

  return new Intl.NumberFormat('en-IN', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

export { formatDate, formatDateTime } from '@kit/shared/utils';
