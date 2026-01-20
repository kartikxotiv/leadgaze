import {
  CONTACT_STATUS_STYLE_MAP,
  type StatusOptionValue,
} from "@/lib/constants/sales-contacts";

export function formatStatus(status?: string | null) {
  if (!status) return "";
  return status
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatDateTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function normalizePhoneNumberFromString(
  value?: string | null,
): number | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  if (Number.isNaN(parsed)) {
    return null;
  }
  // Removed Int32 check as phone numbers can be larger than Int32
  return parsed;
  return parsed;
}

export function getPlatformBadgeColors(label: string) {
  const trimmed = label.trim();
  if (!trimmed) {
    return undefined;
  }
  let hash = 0;
  for (let i = 0; i < trimmed.length; i += 1) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  const backgroundColor = `hsla(${hue}, 80%, 90%, 0.9)`;
  const color = `hsl(${hue}, 60%, 32%)`;
  return { backgroundColor, color };
}

export function getStatusStyle(status?: string | null): string {
  if (!status) return "bg-gray-100 text-gray-700";
  const statusValue = status as StatusOptionValue;
  return CONTACT_STATUS_STYLE_MAP[statusValue] ?? "bg-gray-100 text-gray-700";
}
