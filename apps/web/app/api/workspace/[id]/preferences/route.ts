import { NextRequest } from 'next/server';

import { enhanceRouteHandler } from '@kit/next/routes';

import { 
  getWorkspacePreferencesById,
  updateWorkspacePreferencesById 
} from './controller';

/**
 * GET /api/workspace/{id}/preferences
 * 
 * Get workspace preferences by ID.
 * Replaces direct Supabase calls from frontend.
 */
export const GET = enhanceRouteHandler(getWorkspacePreferencesById, {
  auth: true,
});

/**
 * PUT /api/workspace/{id}/preferences
 * 
 * Update workspace preferences by ID.
 */
export const PUT = enhanceRouteHandler(updateWorkspacePreferencesById, {
  auth: true,
});