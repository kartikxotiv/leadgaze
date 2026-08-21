import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role_id: z.string().uuid(),
});

export const inviteUser = catchAsync(async ({ request }: { request: NextRequest }) => {
  const adminClient = getSupabaseServerAdminClient();
  const authClient = getSupabaseServerClient();
  
  // Get the current user to record who assigned the role
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const body = await request.json();
  const parsed = inviteUserSchema.parse(body);

  // 1. Invite the user via Supabase Auth Admin
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    parsed.email,
    {
      data: {
        name: parsed.name,
      }
    }
  );

  if (inviteError) throw inviteError;
  const invitedUserId = inviteData.user.id;

  // 2. We need to make sure they are in the accounts table. 
  // (Assuming there is a trigger that creates the account on user creation).
  // If we just created the user, the trigger might take a moment, but since this is server-side, 
  // the insert in accounts is usually synchronous via trigger.

  // 3. Assign the admin role
  const { error: roleError } = await adminClient
    .schema('admin')
    .from('admin_roles')
    .insert({
      admin_user_id: invitedUserId,
      role_id: parsed.role_id,
      assigned_by: user.id,
    });

  if (roleError) throw roleError;

  return successDataResponse({ data: { message: 'User invited successfully', user: inviteData.user } });
});
