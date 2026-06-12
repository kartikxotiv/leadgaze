export type PermissionAccessLevel = 'none' | 'own' | 'team' | 'all';

export type RbacPermission = {
  module_key: string;
  feature_key: string;
  can_access: boolean;
  access_level: PermissionAccessLevel;
};

export type RbacSnapshot = {
  organizationId: string;
  employeeId: string | null;
  roleKeys: Array<string>;
  allowedModules: Array<string>;
  permissions: Array<RbacPermission>;
};

export type ApiSuccessResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string | null;
  data: T;
};
