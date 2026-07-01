import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync, successDataResponse } from '../../../utils/response-handler';

export const createCompany = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { name, billing_country, logo_url, created_by } = body;

    if (!name || !billing_country) {
      return NextResponse.json(
        { message: 'Name and billing_country are required' },
        { status: 400 }
      );
    }

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name,
        billing_country,
        logo_url,
        created_by,
      })
      .select()
      .single();

    if (error) {
      console.error('Company creation error:', error);
      return NextResponse.json(
        { message: 'Failed to create company' },
        { status: 500 }
      );
    }

    return successDataResponse(company, 'Company created successfully');
  }
);

export const updateCompany = catchAsync(
  async ({ request, params }: { request: NextRequest; params: { id: string } }) => {
    const supabase = getSupabaseServerClient();
    const companyId = params.id;
    const body = await request.json();
    
    if (!companyId) {
      return NextResponse.json({ message: 'Company ID is required' }, { status: 400 });
    }

    const { data: company, error } = await supabase
      .from('companies')
      .update(body)
      .eq('id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Company update error:', error);
      return NextResponse.json(
        { message: 'Failed to update company' },
        { status: 500 }
      );
    }

    return successDataResponse(company, 'Company updated successfully');
  }
);
