import { formatFundraisingDate, formatFundraisingDateTime } from './formatters';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function hideRawId(value?: string | null, fallback = '-') {
  if (!value || uuidPattern.test(value)) return fallback;
  return value;
}

export function ownerDisplay(row: Record<string, any>) {
  return hideRawId(row.owner_label ?? row.owner_name ?? row.owner_id, 'Unassigned');
}

export function dealDisplay(row: Record<string, any>) {
  return hideRawId(row.display_label ?? row.display_name ?? row.round_name ?? row.investor_name, 'Deal');
}

export function investorDisplay(row: Record<string, any>) {
  return hideRawId(row.investor_label ?? row.investor_name ?? row.investor_id, 'Investor');
}

export function roundDisplay(row: Record<string, any>) {
  return hideRawId(row.round_label ?? row.round_name ?? row.round_id, '-');
}

export function stageDisplay(row: Record<string, any>) {
  return hideRawId(row.stage_label ?? row.stage_name ?? row.stage_id, '-');
}

export function dateDisplay(displayValue?: string | null, rawValue?: string | null) {
  if (displayValue && displayValue !== '-') return displayValue;
  return formatFundraisingDate(rawValue);
}

export function dateTimeDisplay(displayValue?: string | null, rawValue?: string | null) {
  if (displayValue && displayValue !== '-') return displayValue;
  return formatFundraisingDateTime(rawValue);
}
