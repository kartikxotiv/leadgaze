import { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

export const getPermissions = catchAsync(async () => {
  const adminClient = getSupabaseServerAdminClient();

  // Query admin.permissions
  const { data: permissions, error } = await adminClient
    .schema('admin')
    .from('permissions')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;

  return successDataResponse({
    data: permissions || [],
    count: permissions?.length || 0,
  });
});
