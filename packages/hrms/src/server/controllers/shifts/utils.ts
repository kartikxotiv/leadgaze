import { ApiError } from '../../../utils/response-handler';
import {
  type SupabaseAdminClient,
  requireEmployeePermission,
} from '../employees/controller.helpers';

function normalizeNullable(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function getShiftId(params?: Record<string, string>) {
  const shiftId = params?.shiftId;

  if (!shiftId) {
    throw new ApiError('Shift id is required', 400);
  }

  return shiftId;
}

async function requireAdminRole(params: {
  accountId: string;
  supabaseAdmin: SupabaseAdminClient;
  workspaceId: string;
}) {
  await requireEmployeePermission({
    featureKey: 'create',
    minAccessLevel: 'team',
    moduleKey: 'hrms_attendance',
    supabaseAdmin: params.supabaseAdmin,
    userId: params.accountId,
    workspaceId: params.workspaceId,
  });
}

export { getShiftId, normalizeNullable, requireAdminRole };
