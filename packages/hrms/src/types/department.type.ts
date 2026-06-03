export type DepartmentHeadAccount = {
  id: string;
  name: string;
  email: string | null;
};

export type DepartmentParent = {
  id: string;
  name: string;
  code: string;
};

export type Department = {
  id: string;
  organization_id?: string;
  workspace_id: string;
  name: string;
  code: string;
  cost_center_code: string | null;
  is_active: boolean;
  head_account_id: string | null;
  parent_department_id: string | null;
  created_at: string;
  updated_at: string;
  head_account: DepartmentHeadAccount | null;
  parent_department: DepartmentParent | null;
};

export type DepartmentFormPayload = {
  name: string;
  code: string;
  cost_center_code?: string | null;
  head_account_id?: string | null;
  parent_department_id?: string | null;
  is_active?: boolean;
};

export type DepartmentOptions = {
  departments: Array<DepartmentParent>;
  headAccounts: Array<DepartmentHeadAccount>;
};

export type ApiSuccessResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string | null;
  data: T;
};
