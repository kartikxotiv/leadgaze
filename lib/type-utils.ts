// Type utilities to handle Sequelize model type issues
export function castModelData<T = any>(model: any): T {
  return model?.dataValues || model;
}

export function castApiResponse<T = any>(
  response: unknown
): { data: T; success: boolean } {
  return response as { data: T; success: boolean };
}

// Helper to extract organizationId from auth store
export function getOrganizationId(
  currentOrganization: any
): string | undefined {
  return currentOrganization?.organizationId;
}

// Type guard for auth state
export function isAuthenticated(user: any, token: any): boolean {
  return !!(user && token);
}
