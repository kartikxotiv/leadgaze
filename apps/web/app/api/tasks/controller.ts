import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse
} from '~/utils/response-handler';
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
 * GET /api/tasks
 * Fetch tasks for an entity
 */
export const getTasks = catchAsync(
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
    const status = url.searchParams.get('status') || 'active'; // active or completed
    const isCompletedFilter = status === 'completed';

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let uniqueTasks: any[] = [];

    if (entityType && entityId) {
      const { data, error } = await supabase
        .rpc('get_core_tasks', {
          p_workspace_id: workspaceId,
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_status: status,
        });

      if (error) throw error;
      // Handle both paginated object { data: [...] } and raw array responses
      uniqueTasks = (data as any)?.data || data || [];
    } else {
      const { data, error } = await supabase
        .schema('core')
        .from('tasks')
        .select('*, task_relations(*)')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .eq('is_completed', isCompletedFilter);

      if (error) throw error;
      uniqueTasks = data || [];
    }

    // Retrieve creator names
    const accountIds = Array.from(
      new Set(
        uniqueTasks
          .flatMap((t) => [t.created_by, t.completed_by])
          .filter(Boolean)
      ),
    );
    const accountsMap = new Map();
    if (accountIds.length > 0) {
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, name, email')
        .in('id', accountIds);
      accountsData?.forEach((acc: any) => {
        accountsMap.set(acc.id, acc);
      });
    }

    uniqueTasks.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    // Role-based visibility check: Workspace owner or admin role
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role_id, workspace_roles(role_key)')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    const isWorkspaceOwner = workspace?.owner_id === user.id;
    const roleKey = (membership?.workspace_roles as any)?.role_key;
    const isAdmin = isWorkspaceOwner || roleKey === 'admin' || roleKey === 'owner';

    // Fetch total logged minutes per task (if user is admin/owner)
    const taskIdsToQuery = uniqueTasks.map((t) => t.id);
    const totalTimesMap = new Map<string, number>();

    if (isAdmin && taskIdsToQuery.length > 0) {
      const { data: sumsData, error: sumsError } = await supabase
        .schema('core')
        .from('task_time_logs')
        .select('task_id, duration_minutes')
        .in('task_id', taskIdsToQuery);

      if (!sumsError && sumsData) {
        sumsData.forEach((log: any) => {
          const currentSum = totalTimesMap.get(log.task_id) || 0;
          totalTimesMap.set(log.task_id, currentSum + log.duration_minutes);
        });
      }
    }

    const tasksWithDetails = await Promise.all(
      uniqueTasks.map(async (task) => {
        const relation = task.task_relations?.[0] || {};
        const entityTypeVal = toUiEntityType(task.entity_type ?? relation.entity_type);
        const entityIdVal = task.entity_id ?? relation.entity_id;
        const entityName = entityTypeVal && entityIdVal
          ? await getEntityName(supabase, entityTypeVal as any, entityIdVal)
          : null;
        return {
          ...task,
          entity_type: entityTypeVal,
          entity_id: entityIdVal,
          entity_name: entityName,
          created_by_user: task.created_by ? accountsMap.get(task.created_by) || null : null,
          completed_by_user: task.completed_by ? accountsMap.get(task.completed_by) || null : null,
          total_logged_minutes: isAdmin ? (totalTimesMap.get(task.id) || 0) : null,
        };
      }),
    );

    return successDataResponse('Tasks retrieved', tasksWithDetails);
  },
);

/**
 * POST /api/tasks
 * Create a new task
 */
export const createTask = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { workspace_id, entity_type, entity_id, title, description, due_date, priority } = body;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: taskData, error: taskError } = await supabase
      .schema('core')
      .from('tasks')
      .insert({
        workspace_id,
        title,
        description: description || null,
        due_date: due_date || null,
        priority: priority || 'medium',
        created_by: user.id,
        updated_by: user.id,
      })
      .select('*')
      .single();

    if (taskError) {
      console.error('Create task error:', taskError);
      throw taskError;
    }

    const { error: relationError } = await supabase
      .schema('core')
      .from('task_relations')
      .insert({
        workspace_id,
        task_id: taskData.id,
        entity_type: toDbEntityType(entity_type),
        entity_id,
      });

    if (relationError) {
      console.error('Create task relation error:', relationError);
      throw relationError;
    }

    const { data: userAccount } = await supabase
      .from('accounts')
      .select('name, email')
      .eq('id', user.id)
      .single();

    const task = {
      ...taskData,
      entity_type: toUiEntityType(entity_type),
      entity_id,
      created_by_user: userAccount,
    };

    return successDataResponse('Task created', task);
  },
);

/**
 * PATCH /api/tasks/[id]
 * Update a task (edit title, description, due_date, completion state)
 */
export const updateTask = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const taskId = params?.id;
    const body = await request.json();
    const { title, description, due_date, priority, is_completed } = body;

    if (!taskId) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (due_date !== undefined) updatePayload.due_date = due_date;
    if (priority !== undefined) updatePayload.priority = priority;

    if (is_completed !== undefined) {
      updatePayload.is_completed = is_completed;
      if (is_completed) {
        updatePayload.completed_at = new Date().toISOString();
        updatePayload.completed_by = user.id;
      } else {
        updatePayload.completed_at = null;
        updatePayload.completed_by = null;
      }
    }

    const { data: taskData, error } = await supabase
      .schema('core')
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select('*')
      .single();

    if (error) {
      console.error('Update task error:', error);
      throw error;
    }

    let userAccount = null;
    if (taskData.created_by) {
      const { data } = await supabase
        .from('accounts')
        .select('name, email')
        .eq('id', taskData.created_by)
        .maybeSingle();
      userAccount = data;
    }

    let completedAccount = null;
    if (taskData.completed_by) {
      const { data } = await supabase
        .from('accounts')
        .select('name, email')
        .eq('id', taskData.completed_by)
        .maybeSingle();
      completedAccount = data;
    }

    const { data: relation } = await supabase
      .schema('core')
      .from('task_relations')
      .select('entity_type, entity_id')
      .eq('task_id', taskId)
      .maybeSingle();

    const task = {
      ...taskData,
      entity_type: toUiEntityType(relation?.entity_type),
      entity_id: relation?.entity_id,
      created_by_user: userAccount,
      completed_by_user: completedAccount,
    };

    return successDataResponse('Task updated', task);
  },
);

/**
 * DELETE /api/tasks/[id]
 * Delete a task
 */
export const deleteTask = catchAsync(
  async ({
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const taskId = params?.id;

    if (!taskId) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .schema('core')
      .from('tasks')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', taskId);

    if (error) throw error;

    return successDataResponse('Task deleted');
  },
);

/**
 * GET /api/tasks/[id]/time-logs
 * Get logged time for a specific task
 */
export const getTimeLogs = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const taskId = params?.id;
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!taskId || !workspaceId) {
      return NextResponse.json(
        { message: 'taskId and workspaceId are required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Role-based visibility check: Workspace owner or admin role
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role_id, workspace_roles(role_key)')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    const isWorkspaceOwner = workspace?.owner_id === user.id;
    const roleKey = (membership?.workspace_roles as any)?.role_key;
    const isAdmin = isWorkspaceOwner || roleKey === 'admin' || roleKey === 'owner';

    let query = supabase
      .schema('core')
      .from('task_time_logs')
      .select('*')
      .eq('task_id', taskId);

    // If not admin, only retrieve user's own time logs
    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data: logsData, error } = await query;
    if (error) throw error;

    const logs = logsData || [];

    // Fetch user profiles for the logs
    const userIds = Array.from(new Set(logs.map((l) => l.user_id).filter(Boolean)));
    const accountsMap = new Map();
    if (userIds.length > 0) {
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, name, email')
        .in('id', userIds);
      accountsData?.forEach((acc: any) => {
        accountsMap.set(acc.id, acc);
      });
    }

    const logsWithUser = logs.map((log) => ({
      ...log,
      user: accountsMap.get(log.user_id) || null,
    }));

    return successDataResponse('Time logs retrieved', logsWithUser);
  },
);

/**
 * POST /api/tasks/[id]/time-logs
 * Log time on a task
 */
export const createTimeLog = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const taskId = params?.id;
    const body = await request.json();
    const { workspace_id, duration_minutes, description, logged_at } = body;

    if (!taskId || !workspace_id || !duration_minutes) {
      return NextResponse.json(
        { message: 'taskId, workspace_id, and duration_minutes are required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: logData, error } = await supabase
      .schema('core')
      .from('task_time_logs')
      .insert({
        workspace_id,
        task_id: taskId,
        user_id: user.id,
        duration_minutes,
        description: description || null,
        logged_at: logged_at || new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      console.error('Create time log error:', error);
      throw error;
    }

    const { data: userAccount } = await supabase
      .from('accounts')
      .select('name, email')
      .eq('id', user.id)
      .single();

    const responseLog = {
      ...logData,
      user: userAccount,
    };

    return successDataResponse('Time logged successfully', responseLog);
  },
);
