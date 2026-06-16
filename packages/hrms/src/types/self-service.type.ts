export type PermissionAccessLevel = 'none' | 'own' | 'team';

export type ApiSuccessResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string | null;
  data: T;
};

export type SelfServiceRequestCategory =
  | 'payroll'
  | 'policy'
  | 'personal_details'
  | 'documents'
  | 'benefits'
  | 'other';

export type SelfServiceRequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export type SelfServiceRequestStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed';

export type SelfServiceAnnouncementCategory =
  | 'general'
  | 'policy'
  | 'payroll'
  | 'event';

export type SelfServicePermissions = {
  canView: boolean;
  canUpdateProfile: boolean;
  canCreateRequest: boolean;
  canDownloadPayslip: boolean;
  accessLevel: PermissionAccessLevel;
  employeeId: string;
};

export type SelfServiceDepartment = {
  id: string;
  name: string;
  code: string | null;
} | null;

export type SelfServiceEmployeeProfile = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string | null;
  work_email: string;
  personal_email: string | null;
  phone: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  designation: string | null;
  joining_date: string | null;
  manager_name: string | null;
  department: SelfServiceDepartment;
};

export type SelfServiceMetricSummary = {
  latestNetPay: number | null;
  openRequests: number;
  activeAnnouncements: number;
  profileCompletion: number;
};

export type SelfServicePayrollRunSummary = {
  id: string;
  name: string | null;
  period_start: string;
  period_end: string;
  payment_date: string | null;
} | null;

export type SelfServicePayslipSummary = {
  id: string;
  status: string;
  gross_salary: number;
  deductions: number;
  employer_contributions: number;
  net_salary: number;
  generated_at: string;
  published_at: string | null;
  payroll_run: SelfServicePayrollRunSummary;
};

export type SelfServiceRequest = {
  id: string;
  category: SelfServiceRequestCategory;
  subject: string;
  description: string;
  priority: SelfServiceRequestPriority;
  status: SelfServiceRequestStatus;
  response_message: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type SelfServiceAnnouncement = {
  id: string;
  title: string;
  summary: string | null;
  body: string;
  category: SelfServiceAnnouncementCategory;
  is_pinned: boolean;
  published_at: string;
  expires_at: string | null;
  cta_label: string | null;
  cta_url: string | null;
};

export type SelfServicePayslipComponent = {
  id: string;
  amount: number;
  quantity: number | null;
  rate: number | null;
  is_taxable: boolean;
  is_employer_side: boolean;
  display_order: number;
  source: string;
  salary_component: {
    id: string;
    code: string;
    name: string;
    type: string;
  } | null;
};

export type SelfServicePayslipDetail = {
  payslip: SelfServicePayslipSummary & {
    employee_name: string;
    employee_code: string | null;
  };
  components: Array<SelfServicePayslipComponent>;
};

export type SelfServiceDashboardResponse = {
  permissions: SelfServicePermissions;
  metrics: SelfServiceMetricSummary;
  employee: SelfServiceEmployeeProfile;
  payslips: Array<SelfServicePayslipSummary>;
  requests: Array<SelfServiceRequest>;
  announcements: Array<SelfServiceAnnouncement>;
};

export type SelfServiceProfileUpdatePayload = Partial<
  Pick<
    SelfServiceEmployeeProfile,
    | 'first_name'
    | 'last_name'
    | 'phone'
    | 'personal_email'
    | 'address'
    | 'emergency_contact_name'
    | 'emergency_contact_phone'
  >
>;

export type SelfServiceRequestCreatePayload = {
  category: SelfServiceRequestCategory;
  subject: string;
  description: string;
  priority: SelfServiceRequestPriority;
};
