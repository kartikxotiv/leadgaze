import { cookies } from 'next/headers';

import type { SupabaseClient } from '@supabase/supabase-js';

const TRUSTED_DEVICE_COOKIE = 'lg_trusted_device';

/**
 * Creates a function that checks if the current request has a valid trusted device.
 * This can be passed to `requireUser` as the `isMfaBypassed` callback.
 */
export function createTrustedDeviceBypass(client: SupabaseClient) {
  return async function isMfaBypassed(): Promise<boolean> {
    try {
      const cookieStore = await cookies();
      const deviceToken = cookieStore.get(TRUSTED_DEVICE_COOKIE)?.value;

      if (!deviceToken) return false;

      const now = new Date().toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: device, error } = await (client as any)
        .schema('core')
        .from('trusted_devices')
        .select('id, expires_at')
        .eq('device_token', deviceToken)
        .gte('expires_at', now)
        .single();

      if (error || !device) return false;

      // Update last_used_at (fire-and-forget)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any)
        .schema('core')
        .from('trusted_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', device.id)
        .then(() => {});

      return true;
    } catch {
      return false;
    }
  };
}
