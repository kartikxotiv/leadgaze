export type EmployeeDocument = {
  id: string;
  organization_id?: string;
  workspace_id: string;
  employee_id: string | null;
  name: string;
  file_url: string;
  uploaded_at: string;
  expiry_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  employee?: {
    employee_code: string;
    first_name: string;
    last_name: string | null;
    work_email: string;
  } | null;
};

export type DocumentFormPayload = {
  name: string;
  employeeId: string;
  uploadFile: string;
};

export type ApiSuccessResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string | null;
  data: T;
};
