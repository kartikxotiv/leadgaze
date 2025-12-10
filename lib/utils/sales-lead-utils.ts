import type { LeadPriority } from "@/lib/data/lead-priorities";

export const ADD_PLATFORM_SELECT_VALUE = "__add_new_platform__";
export const NO_SELECTION_VALUE = "__none__";

export const KNOWN_PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f59e0b",
  normal: "#3b82f6",
  medium: "#3b82f6",
  low: "#6b7280",
};

export const PRIORITY_COLOR_ARRAY = [
  "#ef4444",
  "#f59e0b",
  "#3b82f6",
  "#6b7280",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
];

export function resolvePriorityColor(
  name?: string | null,
  fallback?: string | null
): string {
  if (fallback && fallback.trim() !== "") {
    return fallback;
  }
  if (!name) return "#2563eb";
  const key = name.toLowerCase();
  return KNOWN_PRIORITY_COLORS[key] ?? "#2563eb";
}

export function formatStatus(status?: string | null): string {
  if (!status) return "";
  return status
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatDateTimeWithTime(value?: string | null): string {
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

export function normalizePhoneNumber(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  if (Number.isNaN(parsed)) {
    return null;
  }
  const INT32_MAX = 2_147_483_647;
  const INT32_MIN = -2_147_483_648;
  if (parsed > INT32_MAX || parsed < INT32_MIN) {
    return null;
  }
  return parsed;
}

export function formatPhoneNumber(value?: number | null): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function hexToRgba(hex: string, alpha: number): string | undefined {
  if (!hex) return undefined;
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return undefined;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return undefined;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildContactLabel(contact: any): string {
  if (!contact) return "";
  const parts = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (parts) return parts;
  return contact.email || `Contact ${contact.id}`;
}

export function mapLeadToTableRow(
  lead: any,
  options: {
    priorityMap: Map<string, LeadPriority>;
    platformMap: Map<number, string>;
    contactNameMap: Map<string, string>;
    contactPhoneMap: Map<string, string>;
  }
) {
  const priority = lead.priority
    ? options.priorityMap.get(lead.priority)
    : undefined;
  const platformLabel =
    lead.platform !== undefined && lead.platform !== null
      ? options.platformMap.get(lead.platform) ?? `ID ${lead.platform}`
      : "";
  const contactLabel = lead.contact_id
    ? options.contactNameMap.get(lead.contact_id) ?? ""
    : "";
  const contactPhone =
    lead.contact_id && options.contactPhoneMap.has(lead.contact_id)
      ? options.contactPhoneMap.get(lead.contact_id)
      : undefined;
  const phoneDisplay =
    lead.phone_number !== undefined &&
    lead.phone_number !== null &&
    lead.phone_number !== ""
      ? formatPhoneNumber(lead.phone_number)
      : contactPhone ?? "";

  return {
    ...lead,
    status: lead.status || "opportunities", // Explicitly preserve status for color mapping
    priority_label: priority?.name ?? "",
    priority_color:
      priority?.color && priority.color.trim() !== "" ? priority.color : null,
    platform_label: platformLabel,
    status_label: formatStatus(lead.status),
    contact_label: contactLabel,
    phone_display: phoneDisplay,
    created_at_label: formatDateTime(lead.created_at),
    updated_at_label: formatDateTime(lead.updated_at),
  };
}
