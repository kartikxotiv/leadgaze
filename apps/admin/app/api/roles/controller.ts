import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

export const getRoles = catchAsync(async () => {
  const adminClient = getSupabaseServerAdminClient();

  // Query admin.roles
  const { data: roles, error } = await adminClient
    .schema('admin')
    .from('roles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return successDataResponse({
    data: roles || [],
    count: roles?.length || 0,
  });
});

const createRoleSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
});

export const createRole = catchAsync(async ({ request }: { request: NextRequest }) => {
  const adminClient = getSupabaseServerAdminClient();
  const body = await request.json();
  const parsed = createRoleSchema.parse(body);

  const { data: role, error } = await adminClient
    .schema('admin')
    .from('roles')
    .insert({
      name: parsed.name,
      slug: parsed.slug,
      description: parsed.description,
      is_system: false,
    })
    .select()
    .single();

  if (error) throw error;

  return successDataResponse({ data: role });
});
