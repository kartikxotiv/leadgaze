import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { catchAsync } from '~/utils/response-handler';

export const getContactsMeta = catchAsync(async ({ request }: { request: NextRequest }) => {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');
  const userId = searchParams.get('userId');
  const productKey = searchParams.get('productKey') || 'sales';

  if (!workspaceId || !userId) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  const adminClient = getSupabaseServerAdminClient();

  try {
    // 1. Fetch Entity Fields from core schema
    const { data: fields, error: fieldsError } = await adminClient.schema('core')
      .from('entity_fields')
      .select(`
        *,
        access_rule:field_access_rules(
          id,
          access_type,
          members:field_access_members(
            id,
            member_type,
            member_id,
            can_view,
            can_edit
          )
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('entity_type', 'contacts')
      .eq('product_key', productKey)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (fieldsError) throw new Error('fieldsError: ' + JSON.stringify(fieldsError));

    // 2. Fetch User Column Preferences from core schema
    const { data: preferences, error: preferencesError } = await adminClient.schema('core')
      .from('user_column_preferences')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('entity_type', 'contacts')
      .maybeSingle();

    if (preferencesError) throw new Error('preferencesError: ' + JSON.stringify(preferencesError));

    // 3. Fetch CRM Module ID for contacts from public schema
    const { data: module, error: moduleError } = await adminClient.schema('public')
      .from('crm_modules')
      .select('id')
      .eq('module_key', 'contacts')
      .single();

    let statuses: any[] = [];
    if (module?.id) {
      const { data: statusData } = await adminClient.schema('public')
        .from('entity_statuses')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('module_id', module.id)
        .order('sort_order', { ascending: true });
      statuses = statusData || [];
    }

    // Format fields
    const formattedFields = (fields || []).map((field: any) => ({
      ...field,
      access_members: (Array.isArray(field.access_rule) ? field.access_rule[0]?.members : field.access_rule?.members) || [],
    }));

    return NextResponse.json({
      fields: formattedFields,
      preferences: preferences || null,
      statuses,
    });
  } catch (err: any) {
    console.error('getContactsMeta Error:', err);
    throw err;
  }
});
