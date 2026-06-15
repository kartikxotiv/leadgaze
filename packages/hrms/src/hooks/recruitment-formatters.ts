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

export function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
