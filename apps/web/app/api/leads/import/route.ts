import { NextRequest, NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '../../../../utils/response-handler';

const importLeads = catchAsync(async ({ request }: { request: NextRequest }) => {
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

  // 1. Fetch the module_id for Leads
  const { data: module } = await supabase
    .from('crm_modules')
    .select('id')
    .eq('module_key', 'leads')
    .single();

  // 2. Fetch all lead statuses for this workspace
  let statuses: any[] = [];
  if (module) {
    const { data } = await supabase
      .from('entity_statuses')
      .select('id, status_name, is_default')
      .eq('workspace_id', workspaceId)
      .eq('module_id', module.id);
    statuses = data || [];
  }

  // Find the default status to use as a robust fallback
  const defaultStatus = statuses.find((s) => s.is_default) || statuses[0];

  // 3. Fetch auxiliary relational data (Industries and Sources)
  const [{ data: industries }, { data: sources }] = await Promise.all([
    supabase.from('crm_industries').select('id, industry_name').eq('workspace_id', workspaceId),
    supabase.from('lead_sources').select('id, source_name').eq('workspace_id', workspaceId)
  ]);

  const insertPayloads = data.map((row: any) => {
    const cleanedRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (value !== '') {
        cleanedRow[key] = value;
      }
    }
    
    // Ensure nested custom_fields is passed correctly if it exists
    if (cleanedRow.custom_fields && Object.keys(cleanedRow.custom_fields).length === 0) {
      delete cleanedRow.custom_fields;
    }

    // 4. Status Mapping: Transform the string from CSV into the correct status UUID
    if (cleanedRow.status_id) {
      const match = statuses.find(
        (s) => s.status_name.toLowerCase() === cleanedRow.status_id.toLowerCase()
      );
      cleanedRow.status_id = match ? match.id : defaultStatus?.id;
    } else {
      cleanedRow.status_id = defaultStatus?.id;
    }

    // 5. Industry Mapping
    if (cleanedRow.industry_id) {
      const match = (industries || []).find(
        (i) => i.industry_name.toLowerCase() === cleanedRow.industry_id.toLowerCase()
      );
      if (match) {
        cleanedRow.industry_id = match.id;
      } else {
        delete cleanedRow.industry_id; // Set to null/remove if unmapped or invalid string
      }
    }

    // 6. Source Mapping
    if (cleanedRow.source_id) {
      const match = (sources || []).find(
        (s) => s.source_name.toLowerCase() === cleanedRow.source_id.toLowerCase()
      );
      if (match) {
        cleanedRow.source_id = match.id;
      } else {
        delete cleanedRow.source_id; // Set to null/remove if unmapped
      }
    }

    // 7. Owner ID Mapping
    // If the user typed a name instead of a UUID, we discard it and fallback to the uploader
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (cleanedRow.owner_id && !uuidRegex.test(cleanedRow.owner_id)) {
      cleanedRow.owner_id = user.id;
    }

    return {
      workspace_id: workspaceId,
      created_by: user.id,
      owner_id: user.id,
      ...cleanedRow,
    };
  });

  const { data: result, error } = await supabase
    .from('crm_leads')
    .insert(insertPayloads)
    .select('id');

  if (error) {
    console.error('Import leads error:', error);
    
    // Catch PostgreSQL Unique Violation Error (23505)
    if (error.code === '23505' && error.message?.includes('email')) {
      return NextResponse.json(
        { 
          message: 'Upload failed: One or more leads in this CSV already exist in your database (duplicate email address). Please ensure all emails are unique.' 
        }, 
        { status: 409 }
      );
    }

    throw error;
  }

  return NextResponse.json({
    message: 'Leads imported successfully',
    count: result?.length || 0,
  });
});

export const POST = enhanceRouteHandler(importLeads, {
  auth: false,
});
