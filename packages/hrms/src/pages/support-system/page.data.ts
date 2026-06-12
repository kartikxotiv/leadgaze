import type {
  SupportSystemRequest,
  SupportSystemRequestUpdatePayload,
} from '../../types/support-system.type';

export const SUPPORT_SYSTEM_TABS = [
  {
    description: 'Every support request in the workspace.',
    label: 'All',
    value: 'all',
  },
  {
    description: 'Tickets waiting for the first HR response.',
    label: 'Open',
    value: 'open',
  },
  {
    description: 'Requests that are actively being worked on.',
    label: 'In Progress',
    value: 'in_progress',
  },
  {
    description: 'Tickets that are already closed out.',
    label: 'Resolved',
    value: 'resolved',
  },
] as const;

export type SupportSystemTabValue =
  (typeof SUPPORT_SYSTEM_TABS)[number]['value'];

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function getSupportRequestCategoryLabel(category: string) {
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getSupportRequestStatusLabel(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getSupportTabRequests(
  requests: SupportSystemRequest[],
  activeTab: SupportSystemTabValue,
) {
  if (activeTab === 'all') {
    return requests;
  }

  if (activeTab === 'resolved') {
    return requests.filter((request) =>
      ['resolved', 'closed'].includes(request.status),
    );
  }

  return requests.filter((request) => request.status === activeTab);
}

export function getSupportRequestUpdatePayload(
  payload: SupportSystemRequestUpdatePayload,
) {
  return {
    priority: payload.priority,
    response_message: payload.response_message ?? null,
    status: payload.status,
  };
}
