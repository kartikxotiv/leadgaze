export type EmployeeDocument = {
  id: string;
  organization_id: string;
  employee_id: string;
  name: string;
  file_url: string;
  uploaded_at: string;
  employee?: {
    first_name: string;
    last_name: string | null;
  };
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
