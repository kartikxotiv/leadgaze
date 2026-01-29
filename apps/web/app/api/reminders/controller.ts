import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse
} from '../../../utils/response-handler';
import { getRelatedEntityIds } from '../_helpers/get-related-entities';
import { getEntityName } from '../_helpers/get-entity-name';

/**
 * GET /api/reminders
 * Fetch reminders for an entity
 * Includes reminders from related entities (lead conversion chain)
 * Filters by user unless workspace owner
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

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is workspace owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    const isWorkspaceOwner = workspace?.owner_id === user.id;

    // Get all related entity IDs (includes lead conversion chain)
    const entityIds = await getRelatedEntityIds(supabase, entityType, entityId);

    // Build query - fetch reminders for all related entities
    const reminderPromises = entityIds.map(({ entity_type, entity_id }) => {
      let query = supabase
        .from('crm_reminders')
        .select(
          '*, assigned_to_user:accounts!crm_reminders_assigned_to_fkey(name, email), created_by_user:accounts!crm_reminders_created_by_fkey(name, email)',
        )
        .eq('workspace_id', workspaceId)
        .eq('entity_type', entity_type)
        .eq('entity_id', entity_id)
        .eq('is_deleted', false);

      // Filter by user unless workspace owner
      if (!isWorkspaceOwner) {
        query = query.eq('created_by', user.id);
      }

      return query;
    });

    // Execute all queries and combine results
    const results = await Promise.all(reminderPromises);
    const allReminders = results.flatMap((result) => result.data || []);

    // Filter out old reminders (more than 1 day old)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const filteredReminders = allReminders.filter((reminder) => {
      // Show if not completed
      if (!reminder.is_completed) return true;
      
      // Show if completed within last 1 day
      if (reminder.is_completed && reminder.completed_at) {
        const completedDate = new Date(reminder.completed_at);
        if (completedDate >= oneDayAgo) return true;
      }
      
      // Show if due date is in the future
      if (reminder.due_date) {
        const dueDate = new Date(reminder.due_date);
        if (dueDate >= now) return true;
        // Show if due date is within last 1 day
        if (dueDate >= oneDayAgo) return true;
      }
      
      return false;
    });

    // Remove duplicates
    const uniqueReminders = Array.from(
      new Map(filteredReminders.map((reminder) => [reminder.id, reminder])).values(),
    );

    // Sort by due_date ascending
    uniqueReminders.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    // Add entity names to each reminder
    const remindersWithEntityNames = await Promise.all(
      uniqueReminders.map(async (reminder) => {
        const entityName = await getEntityName(
          supabase,
          reminder.entity_type,
          reminder.entity_id,
        );
        return {
          ...reminder,
          entity_name: entityName,
        };
      }),
    );

    const reminders = remindersWithEntityNames;
    const error = results.find((r) => r.error)?.error;

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

export const updateReminder = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const reminderId = params?.id;
    const body = await request.json();
    const { title, due_date, assigned_to, is_completed } = body;

    if (!reminderId) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }

    const { data: reminder, error } = await supabase
      .from('crm_reminders')
      .update({
        title,
        due_date,
        assigned_to: assigned_to || null,
        is_completed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .select(
        '*, assigned_to_user:accounts!crm_reminders_assigned_to_fkey(name, email)',
      )
      .single();

    if (error) {
      console.error('Update reminder error:', error);
      throw error;
    }

    return successDataResponse('Reminder updated', reminder);
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

    return successDataResponse('Reminder deleted');
  },
);
