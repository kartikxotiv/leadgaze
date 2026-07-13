import { NextRequest, NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '../../../../../utils/response-handler';

const importTickets = catchAsync(async ({ request }: { request: NextRequest }) => {
  const supabase = getSupabaseServerClient();
  const payload = await request.json();
  const { workspaceId, data } = payload;

  if (!workspaceId || !Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // 1. Pre-fetch dictionaries for mapping (all use 'name' instead of 'status_name')
  const [
    { data: statusesData },
    { data: prioritiesData },
    { data: categoriesData }
  ] = await Promise.all([
    supabase.schema('service_cloud').from('ticket_statuses').select('id, name, is_default').eq('workspace_id', workspaceId),
    supabase.schema('service_cloud').from('ticket_priorities').select('id, name, is_default').eq('workspace_id', workspaceId),
    supabase.schema('service_cloud').from('ticket_categories').select('id, name').eq('workspace_id', workspaceId)
  ]);

  const statuses = statusesData || [];
  const priorities = prioritiesData || [];
  const categories = categoriesData || [];
  
  const defaultStatus = statuses.find((s) => s.is_default) || statuses[0];
  const defaultPriority = priorities.find((p) => p.is_default) || priorities[0];

  const insertPayloads = data.map((row: any) => {
    const cleanedRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (value !== '') {
        cleanedRow[key] = value;
      }
    }

    // 2. Status Mapping
    if (cleanedRow.status_id) {
      const match = statuses.find((s) => s.name.toLowerCase() === cleanedRow.status_id.toLowerCase());
      cleanedRow.status_id = match ? match.id : defaultStatus?.id;
    } else {
      cleanedRow.status_id = defaultStatus?.id;
    }

    // 3. Priority Mapping
    if (cleanedRow.priority_id) {
      const match = priorities.find((p) => p.name.toLowerCase() === cleanedRow.priority_id.toLowerCase());
      cleanedRow.priority_id = match ? match.id : defaultPriority?.id;
    } else {
      cleanedRow.priority_id = defaultPriority?.id;
    }

    // 4. Category Mapping
    if (cleanedRow.category_id) {
      const match = categories.find((c) => c.name.toLowerCase() === cleanedRow.category_id.toLowerCase());
      if (match) {
        cleanedRow.category_id = match.id;
      } else {
        delete cleanedRow.category_id;
      }
    }

    // 5. Assigned Agent ID Mapping (uses assignee_id in Tickets)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (cleanedRow.assignee_id && !uuidRegex.test(cleanedRow.assignee_id)) {
      cleanedRow.assignee_id = user.id;
    }

    return {
      workspace_id: workspaceId,
      created_by: user.id,
      assignee_id: user.id,
      ...cleanedRow,
    };
  });

  const { data: result, error } = await supabase
    .schema('service_cloud')
    .from('tickets')
    .insert(insertPayloads)
    .select('id');

  if (error) {
    console.error('Import tickets error:', error);
    
    if (error.code === '23505') {
      return NextResponse.json(
        { message: 'Upload failed: One or more tickets in this CSV already exist in your database (duplicate unique field).' }, 
        { status: 409 }
      );
    }

    throw error;
  }

  return NextResponse.json({
    message: 'Tickets imported successfully',
    count: result?.length || 0,
  });
});

export const POST = enhanceRouteHandler(importTickets, {
  auth: false,
});
