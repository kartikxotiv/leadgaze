import { formatDate } from '@kit/shared/utils';
import type { EmployeeOption } from '../types/separation.type';

export const NONE = '__none__';

export const daysBetween = (
  d1: Date,
  d2String: string | null | undefined,
): number | null => {
  if (!d2String) return null;

  const d2 = new Date(`${d2String}T00:00:00`);
  if (Number.isNaN(d2.getTime())) return null;

  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export function employeeName(employee?: EmployeeOption | null) {
  if (!employee) {
    return '-';
  }

  const fullName = [employee.first_name, employee.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || employee.employee_code || employee.id;
}

export function toIsoDateTime(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function formatNumberInput(value: string) {
  if (value === '') return value;

  return value.replace(/^(-?)0+(?=\d)/, '$1');
}

export function parseNullableNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return null;
  }

  return number;
}

export function toDateInput(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

export function toDateTimeLocalInput(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const withOffset = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return withOffset.toISOString().slice(0, 16);
}



export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export function startCase(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return value
    .toString()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

// Re-export shared date formatter for legacy imports
export { formatDate } from '@kit/shared/utils';
