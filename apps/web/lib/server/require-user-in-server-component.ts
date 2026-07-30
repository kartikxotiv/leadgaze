import 'server-only';

import { cache } from 'react';

import { redirect } from 'next/navigation';

import { createTrustedDeviceBypass } from '@kit/supabase/check-trusted-device';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getUserContext } from './get-user-context';
export const requireUserInServerComponent = cache(async () => {
  const client = getSupabaseServerClient();
  const result = await requireUser(client, createTrustedDeviceBypass(client));

  if (result.error) {
    redirect(result.redirectTo);
  }

  const user = result.data;

  // Check if an impersonation session is active
  try {
    const ctx = await getUserContext();
    if (ctx.isImpersonating && ctx.targetUser) {
      return {
        ...user,
        id: ctx.effectiveUserId,
        email: ctx.targetUser.email || user.email,
        user_metadata: {
          ...user.user_metadata,
          full_name: ctx.targetUser.full_name,
          name: ctx.targetUser.full_name,
        },
      };
    }
  } catch (err) {
    console.error('Error applying impersonation to user context:', err);
  }

  return user;
});
