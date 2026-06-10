import type { PermissionAccessLevel } from './rbac.type';
import type {
  SelfServiceRequestCategory,
  SelfServiceRequestPriority,
  SelfServiceRequestStatus,
} from './self-service.type';

export type ApiSuccessResponse<T> = {
  data: T;
  message: string | null;
  statusCode: number;
  success: boolean;
};

export type SupportSystemPermissionSummary = {
  accessLevel: PermissionAccessLevel;
  canUpdate: boolean;
  canView: boolean;
};

export type SupportSystemMetric = {
  hint: string;
  label: string;
  value: number | string;
};

export type SupportSystemRequestEmployee = {
  department_name: string | null;
  designation: string | null;
  employee_code: string;
  id: string;
  name: string;
  work_email: string;
};

export type SupportSystemRequest = {
  category: SelfServiceRequestCategory;
  created_at: string;
  description: string;
  employee: SupportSystemRequestEmployee;
  id: string;
  priority: SelfServiceRequestPriority;
  resolved_at: string | null;
  response_message: string | null;
  status: SelfServiceRequestStatus;
  subject: string;
  updated_at: string;
};

export type SupportSystemDashboardResponse = {
  metrics: SupportSystemMetric[];
  permissions: SupportSystemPermissionSummary;
  requests: SupportSystemRequest[];
};

export type SupportSystemRequestUpdatePayload = {
  priority?: SelfServiceRequestPriority;
  response_message?: string | null;
  status?: SelfServiceRequestStatus;
};
