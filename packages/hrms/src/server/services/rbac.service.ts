/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getMyRbacSnapshotService(): Promise<any> {
  const response = await fetch('/api/rbac/me');
  return response.json();
}

export async function listRolesService(): Promise<any> {
  const response = await fetch('/api/rbac/roles');
  return response.json();
}

export async function createRoleService(data: any): Promise<any> {
  const response = await fetch('/api/rbac/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateRoleService(id: string, data: any): Promise<any> {
  const response = await fetch(`/api/rbac/roles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteRoleService(id: string): Promise<any> {
  const response = await fetch(`/api/rbac/roles/${id}`, {
    method: 'DELETE',
  });
  return response.json();
}

export async function getRolePermissionsService(roleId: string): Promise<any> {
  const response = await fetch(`/api/rbac/roles/${roleId}/permissions`);
  return response.json();
}

export async function updateRolePermissionsService(
  roleId: string,
  permissions: any[],
): Promise<any> {
  const response = await fetch(`/api/rbac/roles/${roleId}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions }),
  });
  return response.json();
}
export async function getRoleService(id: string): Promise<any> {
  const response = await fetch(`/api/rbac/roles/${id}`);
  return response.json();
}
