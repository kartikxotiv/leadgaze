import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

/**
 * GET /api/audit-logs
 * Fetch audit logs for a workspace with filtering
 */
export const getAuditLogs = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const module = url.searchParams.get('module');
    const entityId = url.searchParams.get('entityId');
    const action = url.searchParams.get('action');
    const actorId = url.searchParams.get('actorId');

    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Build the query
    let query = supabase
      .from('audit_logs')
      .select(
        `
          *,
          actor:accounts!audit_logs_actor_id_fkey(id, email, name)
        `,
        { count: 'exact' },
      )
      .eq('workspace_id', workspaceId);

    if (module) {
      query = query.eq('module', module);
    }

    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (actorId) {
      query = query.eq('actor_id', actorId);
    }

    const {
      data: logs,
      count,
      error,
    } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get audit logs error:', error);
      throw error;
    }

    return successDataResponse('Audit logs retrieved successfully', {
      logs: logs || [],
      count: count || 0,
      page,
      limit,
    });
  },
);
