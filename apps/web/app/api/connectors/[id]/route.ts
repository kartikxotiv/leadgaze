import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { enhanceRouteHandler } from '@kit/next/routes';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

export const PATCH = enhanceRouteHandler(
  catchAsync(async ({ request, params }: { request: NextRequest; params?: Record<string, string> }) => {
    const supabase = getSupabaseServerClient() as any;
    const id = params?.id;
    const body = await request.json();
    const { status, name, default_owner_id } = body;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };
    if (status !== undefined) updateData.status = status;
    if (name !== undefined) updateData.name = name;
    if (default_owner_id !== undefined) updateData.default_owner_id = default_owner_id;

    const { data, error } = await supabase
      .schema('core')
      .from('connectors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return successDataResponse('Connector updated successfully', data);
  }),
  { auth: true }
);

export const DELETE = enhanceRouteHandler(
  catchAsync(async ({ params }: { request: NextRequest; params?: Record<string, string> }) => {
    const supabase = getSupabaseServerClient() as any;
    const id = params?.id;

    const { error } = await supabase
      .schema('core')
      .from('connectors')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return successDataResponse('Connector deleted successfully');
  }),
  { auth: true }
);
