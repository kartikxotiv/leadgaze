import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse
} from '../../../utils/response-handler';
import { getRelatedEntityIds } from '../_helpers/get-related-entities';
import { getEntityName } from '../_helpers/get-entity-name';

// Map UI sales entity types to database convention (sales_*)
function toDbEntityType(type: string): string {
  const salesTypes = ['lead', 'contact', 'account', 'opportunity'];
  if (salesTypes.includes(type)) {
    return `sales_${type}`;
  }
  return type;
}

// Map database convention (sales_*) back to UI types
function toUiEntityType(type: string): string {
  if (type?.startsWith('sales_')) {
    return type.substring(6);
  }
  return type;
}

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
    // 'active' | 'completed' | null (null = show active only, for entity widget)
    const statusParam = url.searchParams.get('status');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
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

    let dbReminders: any[] = [];

    if (entityType && entityId) {
      // Get all related entity IDs (includes lead conversion chain)
      const entityIds = await getRelatedEntityIds(supabase, entityType, entityId);

      // Build query - fetch reminders for all related entities
      const reminderPromises = entityIds.map(async ({ entity_type, entity_id }) => {
        const dbType = toDbEntityType(entity_type);
        // Find relations first
        const { data: relations } = await supabase
          .schema('core')
          .from('reminder_relations')
          .select('reminder_id')
          .eq('workspace_id', workspaceId)
          .eq('entity_type', dbType)
          .eq('entity_id', entity_id);

        if (!relations || relations.length === 0) return [];

        const reminderIds = relations.map((r) => r.reminder_id);

        let query = supabase
          .schema('core')
          .from('reminders')
          .select('*')
          .in('id', reminderIds)
          .eq('workspace_id', workspaceId)
          .eq('is_deleted', false);

        if (!isWorkspaceOwner) {
          query = query.eq('created_by', user.id);
        }

        const { data } = await query;
        return (data as any[]) || [];
      });

      const results = await Promise.all(reminderPromises);
      dbReminders = results.flat();
    } else {
      // Fetch all reminders for the workspace
      let query = supabase
        .schema('core')
        .from('reminders')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false);

      if (!isWorkspaceOwner) {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      dbReminders = (data as any[]) || [];
    }

    // Filter strategy:
    // - status=completed  → return only completed reminders (for the standalone "Sent" view)
    // - status=active     → return only non-completed reminders
    // - no status param   → return active + completed within last 1 day (legacy entity widget behaviour)
    let filteredReminders: any[];

    if (statusParam === 'completed') {
      filteredReminders = dbReminders.filter((r) => r.status === 'completed');
    } else if (statusParam === 'active') {
      filteredReminders = dbReminders.filter((r) => r.status !== 'completed');
    } else {
      // Default: active + recently completed (entity widget)
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filteredReminders = dbReminders.filter((reminder) => {
        const isCompleted = reminder.status === 'completed';
        if (!isCompleted) return true;
        if (isCompleted && reminder.completed_at) {
          const completedDate = new Date(reminder.completed_at);
          if (completedDate >= oneDayAgo) return true;
        }
        if (reminder.due_at) {
          const dueDate = new Date(reminder.due_at);
          const now2 = new Date();
          if (dueDate >= now2) return true;
          if (dueDate >= oneDayAgo) return true;
        }
        return false;
      });
    }

    // Remove duplicates
    const uniqueReminders = Array.from(
      new Map(filteredReminders.map((reminder) => [reminder.id, reminder])).values(),
    );

    // Sort by due_at ascending
    uniqueReminders.sort((a, b) => {
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    });

    // Fetch user details for creator and assignee in JS to prevent PostgREST cross-schema join errors
    const userIds = Array.from(
      new Set(
        uniqueReminders
          .flatMap((r) => [r.created_by, r.assigned_to])
          .filter(Boolean),
      ),
    );

    let usersMap: Record<string, { name: string | null; email: string | null }> = {};
    if (userIds.length > 0) {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name, email')
        .in('id', userIds);

      if (accounts) {
        accounts.forEach((acc) => {
          usersMap[acc.id] = { name: acc.name, email: acc.email };
        });
      }
    }

    // Resolve relations to get entity information
    const reminderIds = uniqueReminders.map((r) => r.id);
    let relationsMap: Record<string, { entity_type: string; entity_id: string }> = {};
    if (reminderIds.length > 0) {
      const { data: relations } = await supabase
        .schema('core')
        .from('reminder_relations')
        .select('reminder_id, entity_type, entity_id')
        .in('reminder_id', reminderIds);

      if (relations) {
        relations.forEach((rel) => {
          relationsMap[rel.reminder_id] = {
            entity_type: toUiEntityType(rel.entity_type),
            entity_id: rel.entity_id,
          };
        });
      }
    }

    // Add entity names to each reminder and map response format
    const remindersWithEntityNames = await Promise.all(
      uniqueReminders.map(async (reminder) => {
        const relation = relationsMap[reminder.id];
        const currentEntityType = relation?.entity_type || entityType || 'lead';
        const currentEntityId = relation?.entity_id || entityId || '';

        const entityName = await getEntityName(
          supabase,
          currentEntityType,
          currentEntityId,
        );

        return {
          id: reminder.id,
          workspace_id: reminder.workspace_id,
          title: reminder.title,
          description: reminder.description,
          due_date: reminder.due_at,
          priority: reminder.priority,
          is_completed: reminder.status === 'completed',
          completed_at: reminder.completed_at,
          entity_type: currentEntityType,
          entity_id: currentEntityId,
          assigned_to: reminder.assigned_to,
          created_by: reminder.created_by,
          created_at: reminder.created_at,
          updated_at: reminder.updated_at,
          assigned_to_user: reminder.assigned_to ? usersMap[reminder.assigned_to] || null : null,
          created_by_user: reminder.created_by ? usersMap[reminder.created_by] || null : null,
          entity_name: entityName,
        };
      }),
    );

    return successDataResponse('Reminders retrieved', remindersWithEntityNames || []);
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
      description,
      priority,
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

    // Insert reminder
    const { data: reminderData, error } = await supabase
      .schema('core')
      .from('reminders')
      .insert({
        workspace_id,
        title,
        description: description || null,
        priority: priority || 'medium',
        due_at: due_date,
        assigned_to: assigned_to || null,
        created_by: user.id,
      })
      .select('*')
      .single() as any;

    if (error) {
      console.error('Create reminder error:', error);
      throw error;
    }

    // Insert reminder relation
    const dbType = toDbEntityType(entity_type);
    const { error: relationError } = await supabase
      .schema('core')
      .from('reminder_relations')
      .insert({
        workspace_id,
        reminder_id: reminderData.id,
        entity_type: dbType,
        entity_id,
      });

    if (relationError) {
      console.error('Create reminder relation error:', relationError);
      throw relationError;
    }

    // Retrieve user profiles in JS
    let assignedToUser = null;
    if (reminderData.assigned_to) {
      const { data } = await supabase
        .from('accounts')
        .select('name, email')
        .eq('id', reminderData.assigned_to)
        .maybeSingle();
      assignedToUser = data;
    }

    let createdByUser = null;
    if (reminderData.created_by) {
      const { data } = await supabase
        .from('accounts')
        .select('name, email')
        .eq('id', reminderData.created_by)
        .maybeSingle();
      createdByUser = data;
    }

    const reminder = {
      id: reminderData.id,
      workspace_id: reminderData.workspace_id,
      title: reminderData.title,
      description: reminderData.description,
      due_date: reminderData.due_at,
      priority: reminderData.priority,
      is_completed: reminderData.status === 'completed',
      completed_at: reminderData.completed_at,
      entity_type,
      entity_id,
      assigned_to: reminderData.assigned_to,
      created_by: reminderData.created_by,
      created_at: reminderData.created_at,
      updated_at: reminderData.updated_at,
      assigned_to_user: assignedToUser,
      created_by_user: createdByUser,
    };

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
    const { title, description, priority, due_date, assigned_to, is_completed } = body;

    if (!reminderId) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (priority !== undefined) updatePayload.priority = priority;
    if (due_date !== undefined) updatePayload.due_at = due_date;
    if (assigned_to !== undefined) updatePayload.assigned_to = assigned_to || null;
    if (is_completed !== undefined) {
      updatePayload.status = is_completed ? 'completed' : 'open';
      updatePayload.completed_at = is_completed ? new Date().toISOString() : null;
      updatePayload.completed_by = is_completed ? user.id : null;
    }

    const { data: reminderData, error } = await supabase
      .schema('core')
      .from('reminders')
      .update(updatePayload)
      .eq('id', reminderId)
      .select('*')
      .single() as any;

    if (error) {
      console.error('Update reminder error:', error);
      throw error;
    }

    // Retrieve relation details
    const { data: relation } = await supabase
      .schema('core')
      .from('reminder_relations')
      .select('entity_type, entity_id')
      .eq('reminder_id', reminderId)
      .maybeSingle();

    // Retrieve user profiles in JS
    let assignedToUser = null;
    if (reminderData.assigned_to) {
      const { data } = await supabase
        .from('accounts')
        .select('name, email')
        .eq('id', reminderData.assigned_to)
        .maybeSingle();
      assignedToUser = data;
    }

    let createdByUser = null;
    if (reminderData.created_by) {
      const { data } = await supabase
        .from('accounts')
        .select('name, email')
        .eq('id', reminderData.created_by)
        .maybeSingle();
      createdByUser = data;
    }

    const reminder = {
      id: reminderData.id,
      workspace_id: reminderData.workspace_id,
      title: reminderData.title,
      description: reminderData.description,
      due_date: reminderData.due_at,
      priority: reminderData.priority,
      is_completed: reminderData.status === 'completed',
      completed_at: reminderData.completed_at,
      entity_type: toUiEntityType(relation?.entity_type ?? ''),
      entity_id: relation?.entity_id ?? '',
      assigned_to: reminderData.assigned_to,
      created_by: reminderData.created_by,
      created_at: reminderData.created_at,
      updated_at: reminderData.updated_at,
      assigned_to_user: assignedToUser,
      created_by_user: createdByUser,
    };

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .schema('core')
      .from('reminders')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id || null 
      })
      .eq('id', reminderId);

    if (error) throw error;

    return successDataResponse('Reminder deleted');
  },
);
