import axios from 'axios';

/**
 * Fetch audit logs for a workspace
 */
export async function getAuditLogsService(params: {
  workspaceId: string;
  module?: string;
  entityId?: string;
  action?: string;
  actorId?: string;
  page?: number;
  limit?: number;
  productKey?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
}) {
  const { data } = await axios.get('/api/audit-logs', { params });
  return data.data;
}
