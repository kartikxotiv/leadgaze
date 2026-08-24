import { NextRequest } from 'next/server';

import { enhanceRouteHandler } from '@kit/next/routes';

import { getWorkspaceMembersWithAccounts } from './controller';

/**
 * GET /api/workspace/{id}/members-with-accounts
 * 
 * Get workspace members with full account details.
 * Replaces direct Supabase calls from frontend integration components.
 */
export const GET = enhanceRouteHandler(getWorkspaceMembersWithAccounts, {
  auth: true,
});