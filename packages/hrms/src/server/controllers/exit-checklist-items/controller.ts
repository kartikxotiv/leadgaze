import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requirePermission } from '~/lib/server/rbac';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import {
  ExtendedDatabase,
  getRequiredOrganizationId,
} from '../separation/utils';

type ExitChecklistItemBody = {
  title: string;
  description?: string | null;
};

const listExitChecklistItemsController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);

  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'view_checklist',
    minAccessLevel: 'team',
  });

  const { data, error } = await supabaseAdmin
    .from('exit_checklist_items')
    .select('id, organization_id, title, description, created_at, updated_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(
    'Checklist items fetched successfully',
    data ?? [],
  );
});

const createExitChecklistItemController = catchAsync(async ({ body, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const payload = body as ExitChecklistItemBody;

  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'manage_checklist',
    minAccessLevel: 'team',
  });

  const { data, error } = await supabaseAdmin
    .from('exit_checklist_items')
    .insert({
      organization_id: organizationId,
      title: payload.title,
      description: payload.description ?? null,
    })
    .select('id, organization_id, title, description, created_at, updated_at')
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Checklist item created successfully', data);
});

export { createExitChecklistItemController, listExitChecklistItemsController };
