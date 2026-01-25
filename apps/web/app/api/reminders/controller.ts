import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

/**
 * GET /api/reminders
 * Fetch reminders for an entity
 */
export const getReminders = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const entityType = url.searchParams.get('entityType');
    const entityId = url.searchParams.get('entityId');
    const workspaceId = url.searchParams.get('workspaceId');

    if (!entityType || !entityId || !workspaceId) {
      return NextResponse.json(
        { message: 'entityType, entityId, and workspaceId are required' },
        { status: 400 },
      );
    }

    const { data: reminders, error } = await supabase
      .from('crm_reminders')
      .select(
        '*, assigned_to_user:accounts!crm_reminders_assigned_to_fkey(name, email)',
      )
      .eq('workspace_id', workspaceId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_deleted', false)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Get reminders error:', error);
      throw error;
    }

    return successDataResponse('Reminders retrieved', reminders || []);
  },
);

/**
 * POST /api/reminders
 * Create a new reminder
 */
export const createReminder = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const {
      workspace_id,
      entity_type,
      entity_id,
      title,
      due_date,
      assigned_to,
    } = body;

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: reminder, error } = await supabase
      .from('crm_reminders')
      .insert({
        workspace_id,
        entity_type,
        entity_id,
        title,
        due_date,
        assigned_to: assigned_to || null,
        created_by: user.id,
      })
      .select(
        '*, assigned_to_user:accounts!crm_reminders_assigned_to_fkey(name, email)',
      )
      .single();

    if (error) {
      console.error('Create reminder error:', error);
      throw error;
    }

    return successDataResponse('Reminder created', reminder);
  },
);

export const deleteReminder = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const reminderId = params?.id;

    if (!reminderId)
      return NextResponse.json({ message: 'ID required' }, { status: 400 });

    const { error } = await supabase
      .from('crm_reminders')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', reminderId);

    if (error) throw error;

    return successResponse('Reminder deleted');
  },
);
