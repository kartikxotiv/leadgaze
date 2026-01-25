/**
 * API Route: Get User Permissions
 * Fetches all permission data for the current user in a workspace
 */
import { enhanceRouteHandler } from '@kit/next/routes';

import { getPermissions } from './controller';

export const GET = enhanceRouteHandler(getPermissions, { auth: false });
