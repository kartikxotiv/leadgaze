import type {
  SelfServiceAnnouncementCategory,
  SelfServiceEmployeeProfile,
  SelfServicePayslipSummary,
  SelfServiceRequestCategory,
  SelfServiceRequestPriority,
  SelfServiceRequestStatus,
} from '../../types/self-service.type';

export { formatDate } from '@kit/shared/utils';

export const SELF_SERVICE_REQUEST_CATEGORY_OPTIONS: Array<{
  label: string;
  value: SelfServiceRequestCategory;
}> = [
  { label: 'Payroll', value: 'payroll' },
  { label: 'Policy', value: 'policy' },
  { label: 'Personal details', value: 'personal_details' },
  { label: 'Documents', value: 'documents' },
  { label: 'Benefits', value: 'benefits' },
  { label: 'Other', value: 'other' },
];

export const SELF_SERVICE_REQUEST_PRIORITY_OPTIONS: Array<{
  label: string;
  value: SelfServiceRequestPriority;
}> = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
];

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '-';
  }

  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

export function getRequestStatusLabel(status: SelfServiceRequestStatus) {
  return status.replace(/_/g, ' ');
}

export function getRequestCategoryLabel(category: SelfServiceRequestCategory) {
  return (
    SELF_SERVICE_REQUEST_CATEGORY_OPTIONS.find(
      (option) => option.value === category,
    )?.label ?? category
  );
}

export function getAnnouncementCategoryLabel(
  category: SelfServiceAnnouncementCategory,
) {
  const labels: Record<SelfServiceAnnouncementCategory, string> = {
    event: 'Event',
    general: 'General',
    payroll: 'Payroll',
    policy: 'Policy',
  };

  return labels[category];
}

export function getProfileCompletion(profile: SelfServiceEmployeeProfile) {
  const fields = [
    profile.first_name,
    profile.last_name,
    profile.phone,
    profile.personal_email,
    profile.address,
    profile.emergency_contact_name,
    profile.emergency_contact_phone,
  ];

  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export function formatPayslipPeriod(payslip: SelfServicePayslipSummary) {
  if (payslip.payroll_run?.name) {
    return payslip.payroll_run.name;
  }

  if (payslip.payroll_run?.period_start && payslip.payroll_run?.period_end) {
    return `${formatDate(payslip.payroll_run.period_start)} - ${formatDate(
      payslip.payroll_run.period_end,
    )}`;
  }

  return formatDate(payslip.generated_at);
}
