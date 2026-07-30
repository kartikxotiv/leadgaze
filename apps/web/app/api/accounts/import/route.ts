import { NextRequest, NextResponse } from 'next/server';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '../../../../utils/response-handler';

const importAccounts = catchAsync(async ({ request }: { request: NextRequest }) => {
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

  // 1. Pre-fetch dictionaries for mapping
  const { data: industriesData } = await supabase
    .from('crm_industries')
    .select('id, industry_name')
    .eq('workspace_id', workspaceId);

  const sanitizeNumber = (val: any) => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  const industries = industriesData || [];

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

    // 2. Industry Mapping
    if (cleanedRow.industry_id) {
      const match = industries.find((i) => i.industry_name.toLowerCase() === cleanedRow.industry_id.toLowerCase());
      if (match) {
        cleanedRow.industry_id = match.id;
      } else {
        delete cleanedRow.industry_id;
      }
    }

    // 3. Owner ID Mapping
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (cleanedRow.owner_id && !uuidRegex.test(cleanedRow.owner_id)) {
      cleanedRow.owner_id = user.id;
    }

    // 4. Sanitize Numbers
    if (cleanedRow.annual_revenue !== undefined) cleanedRow.annual_revenue = sanitizeNumber(cleanedRow.annual_revenue);
    if (cleanedRow.employee_count !== undefined) cleanedRow.employee_count = sanitizeNumber(cleanedRow.employee_count);

    return {
      workspace_id: workspaceId,
      created_by: user.id,
      owner_id: user.id,
      ...cleanedRow,
    };
  });

  const { data: result, error } = await supabase
    .from('crm_accounts')
    .insert(insertPayloads)
    .select('id');

  if (error) {
    console.error('Import accounts error:', error);
    
    // Catch PostgreSQL Unique Violation Error (23505)
    if (error.code === '23505') {
      return NextResponse.json(
        { message: 'Upload failed: One or more accounts in this CSV already exist in your database (duplicate unique field).' }, 
        { status: 409 }
      );
    }
    
    throw error;
  }

  return NextResponse.json({
    message: 'Accounts imported successfully',
    count: result?.length || 0,
  });
});

export const POST = enhanceRouteHandler(importAccounts, {
  auth: false,
});
