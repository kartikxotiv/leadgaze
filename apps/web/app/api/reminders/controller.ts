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

import { RemindersService } from '@kit/core';

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

    const priority = url.searchParams.get('priority');
    const searchTerm = url.searchParams.get('searchTerm') || '';
    const createdByIds = url.searchParams.get('createdByIds') || '';
    const createdAtFrom = url.searchParams.get('createdAtFrom') || '';
    const createdAtTo = url.searchParams.get('createdAtTo') || '';
    const updatedAtFrom = url.searchParams.get('updatedAtFrom') || '';
    const updatedAtTo = url.searchParams.get('updatedAtTo') || '';

    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    const page = pageParam ? parseInt(pageParam, 10) : null;
    const limit = limitParam ? parseInt(limitParam, 10) : null;

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

    const remindersService = new RemindersService(supabase);
    const result = await remindersService.getReminders({
      workspaceId,
      entityType,
      entityId,
      status: statusParam,
      priority,
      searchTerm,
      createdByIds,
      createdAtFrom,
      createdAtTo,
      updatedAtFrom,
      updatedAtTo,
      isWorkspaceOwner,
      userId: user.id,
      page,
      limit,
    });

    const rawList = Array.isArray(result) ? result : (result.data || []);
    const formattedReminders = rawList.map((reminder: any) => ({
      id: reminder.id,
      workspace_id: reminder.workspace_id,
      title: reminder.title,
      description: reminder.description,
      due_date: reminder.due_at || reminder.due_date,
      priority: reminder.priority,
      is_completed: reminder.status === 'completed',
      completed_at: reminder.completed_at,
      entity_type: reminder.entity_type || entityType || 'lead',
      entity_id: reminder.entity_id || entityId || '',
      entity_name: reminder.entity_name || '',
      created_by: reminder.created_by,
      assigned_to: reminder.assigned_to,
      created_by_name: reminder.created_by_user?.name || reminder.created_by_user?.email || null,
      created_by_email: reminder.created_by_user?.email || null,
      assigned_to_name: reminder.assigned_to_user?.name || reminder.assigned_to_user?.email || null,
      created_by_user: reminder.created_by_user || (reminder.created_by_name ? { name: reminder.created_by_name, email: reminder.created_by_email } : null),
      assigned_to_user: reminder.assigned_to_user || (reminder.assigned_to_name ? { name: reminder.assigned_to_name } : null),
      created_at: reminder.created_at,
      updated_at: reminder.updated_at,
    }));

    if (pageParam || limitParam) {
      return NextResponse.json({
        success: true,
        data: formattedReminders,
        count: result.total ?? formattedReminders.length,
        total: result.total ?? formattedReminders.length,
        page: result.page ?? 1,
        limit: result.limit ?? formattedReminders.length,
        has_more: result.has_more ?? false,
      });
    }

    return successDataResponse(formattedReminders);
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
