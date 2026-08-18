import 'server-only';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { EntitlementRepository } from './repository';
import { EntitlementService } from './service';

export { EntitlementError, EntitlementService } from './service';
export type { EntitlementReservation } from './service';
export type * from './types';

/** Create once inside each request handler so context caching stays request-local. */
export function createEntitlementService() {
  return new EntitlementService(
    new EntitlementRepository(getSupabaseServerClient()),
  );
}

/** For authenticated machine-to-machine entry points such as signed webhooks. */
export function createServiceRoleEntitlementService() {
  return new EntitlementService(
    new EntitlementRepository(getSupabaseServerAdminClient()),
  );
}
