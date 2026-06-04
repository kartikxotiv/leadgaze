import { NextResponse } from 'next/server';

import { assertCoreWorkspaceAccess } from '../_shared/workspace-access';
import { catchAsync, successDataResponse } from '../../utils/response-handler';

export const getCoreEmailVariablesController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId') ?? url.searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ success: false, message: 'workspaceId is required' }, { status: 400 });
  }

  const { supabase, user, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const { data, error: fetchError } = await (supabase as any)
    .schema('core')
    .from('email_variables')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('key', { ascending: true });

  if (fetchError) throw fetchError;

  return successDataResponse('Email variables retrieved successfully', data ?? []);
});

export const saveCoreEmailVariableController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;

  if (!workspaceId || !body?.key) {
    return NextResponse.json({ success: false, message: 'workspace_id and key are required' }, { status: 400 });
  }

  const { supabase, user, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const payload: Record<string, unknown> = {
    workspace_id: workspaceId,
    key: body.key,
    value: body.value ?? '',
    updated_by: user.id,
  };

  if (body.id) {
    payload.id = body.id;
  } else {
    payload.created_by = user.id;
  }

  const { data, error: saveError } = await (supabase as any)
    .schema('core')
    .from('email_variables')
    .upsert(payload)
    .select('*')
    .single();

  if (saveError) throw saveError;

  return successDataResponse('Email variable saved successfully', data);
});

export const deleteCoreEmailVariableController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const workspaceId = url.searchParams.get('workspaceId') ?? url.searchParams.get('workspace_id');

  if (!id || !workspaceId) {
    return NextResponse.json({ success: false, message: 'id and workspaceId are required' }, { status: 400 });
  }

  const { supabase, user, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const { error: deleteError } = await (supabase as any)
    .schema('core')
    .from('email_variables')
    .delete()
    .eq('id', Number(id))
    .eq('workspace_id', workspaceId);

  if (deleteError) throw deleteError;

  return successDataResponse('Email variable deleted successfully', { id: Number(id) });
});
