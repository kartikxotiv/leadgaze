
export function castModelData<T = any>(model: any): T {
  return model?.dataValues || model;
}

export function castApiResponse<T = any>(
  response: unknown
): { data: T; success: boolean } {
  return response as { data: T; success: boolean };
}

export function getOrganizationId(
  currentOrganization: any
): string | undefined {
  return currentOrganization?.organizationId;
}

export function isAuthenticated(user: any, token: any): boolean {
  return !!(user && token);
}
