import { NextRequest, NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '../../../../utils/response-handler';

const importContacts = catchAsync(async ({ request }: { request: NextRequest }) => {
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

  // 1. Fetch module_id for Contacts
  const { data: module } = await supabase
    .from('crm_modules')
    .select('id')
    .eq('module_key', 'contacts')
    .single();

  // 2. Pre-fetch dictionaries for mapping
  const [{ data: statusesData }, { data: accountsData }] = await Promise.all([
    module 
      ? supabase.from('entity_statuses').select('id, status_name, is_default').eq('workspace_id', workspaceId).eq('module_id', module.id)
      : Promise.resolve({ data: [] }),
    supabase.from('crm_accounts').select('id, account_name').eq('workspace_id', workspaceId)
  ]);

  const statuses = statusesData || [];
  const accounts = accountsData || [];
  const defaultStatus = statuses.find((s) => s.is_default) || statuses[0];

  const insertPayloads = data.map((row: any) => {
    const cleanedRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (value !== '') {
        cleanedRow[key] = value;
      }
    }

    if (cleanedRow.custom_fields && Object.keys(cleanedRow.custom_fields).length === 0) {
      delete cleanedRow.custom_fields;
    }

    // 3. Status Mapping
    if (cleanedRow.status_id) {
      const match = statuses.find((s) => s.status_name.toLowerCase() === cleanedRow.status_id.toLowerCase());
      cleanedRow.status_id = match ? match.id : defaultStatus?.id;
    } else {
      cleanedRow.status_id = defaultStatus?.id;
    }

    // 4. Account Mapping
    if (cleanedRow.account_id) {
      const match = accounts.find((a) => a.account_name.toLowerCase() === cleanedRow.account_id.toLowerCase());
      if (match) {
        cleanedRow.account_id = match.id;
      } else {
        delete cleanedRow.account_id;
      }
    }

    // 5. Owner ID Mapping
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
    .from('crm_contacts')
    .insert(insertPayloads)
    .select('id');

  if (error) {
    console.error('Import contacts error:', error);
    
    // Catch PostgreSQL Unique Violation Error (23505)
    if (error.code === '23505' && error.message?.includes('email')) {
      return NextResponse.json(
        { message: 'Upload failed: One or more contacts in this CSV already exist in your database (duplicate email address).' }, 
        { status: 409 }
      );
    }
    
    throw error;
  }

  return NextResponse.json({
    message: 'Contacts imported successfully',
    count: result?.length || 0,
  });
});

export const POST = enhanceRouteHandler(importContacts, {
  auth: false,
});
