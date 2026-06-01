'use server';

import { NextResponse } from 'next/server';
import { catchAsync, successDataResponse } from '../../utils';
import { assertWorkspaceAccess } from '../_shared/workspace-access';

export const getPipelineStagesController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json({ success: false, message: 'workspaceId query parameter is required' }, { status: 400 });
  }

  const { supabase, error } = await assertWorkspaceAccess(workspaceId);
  if (error) return error;

  const { data, error: fetchError } = await (supabase as any)
    .schema('fundraising')
    .from('pipeline_stages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('Fetch pipeline stages error:', fetchError);
    return NextResponse.json({ success: false, message: 'Failed to retrieve pipeline stages' }, { status: 500 });
  }

  return successDataResponse('Pipeline stages retrieved successfully', data || []);
});

export const createPipelineStageController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });

  const { workspace_id, name, description, display_order = 0, is_default = false, is_closed_won = false, is_closed_lost = false } = body;
  if (!workspace_id || !name) {
    return NextResponse.json({ success: false, message: 'workspace_id and name are required' }, { status: 400 });
  }

  const { supabase, user, error } = await assertWorkspaceAccess(workspace_id);
  if (error || !user) return error!;

  const { data, error: insertError } = await (supabase as any).schema('fundraising').from('pipeline_stages').insert({
    workspace_id,
    name,
    description: description ?? null,
    display_order,
    is_default,
    is_closed_won,
    is_closed_lost,
    created_by: user.id,
    updated_by: user.id,
  }).select('*').single();

  if (insertError) {
    console.error('Create pipeline stage error:', insertError);
    return NextResponse.json({ success: false, message: 'Failed to create pipeline stage' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Pipeline stage created successfully', data }, { status: 201 });
});

export const updatePipelineStageController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;
  if (!body?.id || !workspaceId) return NextResponse.json({ success: false, message: 'id and workspace_id are required' }, { status: 400 });
  const { supabase, user, error } = await assertWorkspaceAccess(workspaceId);
  if (error || !user) return error!;
  const payload = {
    name: body.name,
    description: body.description,
    display_order: body.display_order ?? body.displayOrder,
    is_default: body.is_default ?? body.isDefault,
    is_closed_won: body.is_closed_won ?? body.isClosedWon,
    is_closed_lost: body.is_closed_lost ?? body.isClosedLost,
    updated_by: user.id,
  };
  Object.keys(payload).forEach((key) => (payload as Record<string, unknown>)[key] === undefined && delete (payload as Record<string, unknown>)[key]);
  const { data, error: updateError } = await (supabase as any).schema('fundraising').from('pipeline_stages').update(payload).eq('workspace_id', workspaceId).eq('id', body.id).select('*').single();
  if (updateError) return NextResponse.json({ success: false, message: 'Failed to update pipeline stage' }, { status: 500 });
  return successDataResponse('Pipeline stage updated successfully', data);
});

export const deletePipelineStageController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const workspaceId = url.searchParams.get('workspaceId');
  if (!id || !workspaceId) return NextResponse.json({ success: false, message: 'id and workspaceId are required' }, { status: 400 });
  const { supabase, error } = await assertWorkspaceAccess(workspaceId);
  if (error) return error;
  const { error: deleteError } = await (supabase as any).schema('fundraising').from('pipeline_stages').delete().eq('workspace_id', workspaceId).eq('id', id);
  if (deleteError) return NextResponse.json({ success: false, message: 'Failed to delete pipeline stage' }, { status: 500 });
  return successDataResponse('Pipeline stage deleted successfully', { id });
});
