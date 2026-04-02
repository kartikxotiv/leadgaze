import { enhanceRouteHandler } from '@kit/next/routes';

import { reorderRoles } from './controller';

export const PUT = enhanceRouteHandler(reorderRoles, {
  auth: false, // matches patterns in roles/route.ts protected by Supabase RLS internally
});
