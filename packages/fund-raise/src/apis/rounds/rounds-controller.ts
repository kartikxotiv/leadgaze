'use server';

import { NextResponse } from 'next/server';
import { catchAsync, successDataResponse } from '../../utils';
import { assertWorkspaceAccess } from '../_shared/workspace-access';

/**
 * Zod schemas and validation types will live in packages/fund-raise/src/validators
 */

/**
 * GET /api/fundraising/rounds
 * Controller to fetch active fundraising rounds for a given workspace
 */
export const getRoundsController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const id = url.searchParams.get('id');

  if (!workspaceId) {
    return NextResponse.json({ success: false, message: 'workspaceId query parameter is required' }, { status: 400 });
  }

  const { supabase, error } = await assertWorkspaceAccess(workspaceId);
  if (error) return error;

  let query = (supabase as any)
    .schema('fundraising')
    .from('rounds')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false);

  if (id) query = query.eq('id', id).maybeSingle();
  else query = query.order('created_at', { ascending: false });

  const { data: rounds, error: roundsError } = await query;

  if (roundsError) {
    console.error('Fetch rounds error:', roundsError);
    return NextResponse.json({ success: false, message: 'Failed to retrieve funding rounds' }, { status: 500 });
  }

  return successDataResponse('Funding rounds retrieved successfully', rounds ?? (id ? null : []));
});


/**
 * POST /api/fundraising/rounds
 * Controller to create a new funding round inside the fundraising schema
 */
export const createRoundController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });

  const {
    workspace_id: workspaceId,
    workspaceId: camelWorkspaceId,
    round_name: roundName,
    roundName: camelRoundName,
    round_type: roundType,
    roundType: camelRoundType,
    target_amount,
    targetAmount,
    raised_amount,
    raisedAmount,
    valuation,
    currency,
    status,
    start_date,
    startDate,
    close_date,
    closeDate,
    description,
    tags = [],
    custom_fields = {},
  } = body;

  const workspace_id = workspaceId ?? camelWorkspaceId;
  const round_name = roundName ?? camelRoundName;
  const round_type = roundType ?? camelRoundType;
  const target = target_amount ?? targetAmount;

  if (!workspace_id || !round_name || !round_type || target == null) {
    return NextResponse.json({ success: false, message: 'workspace_id, round_name, round_type, and target_amount are required' }, { status: 400 });
  }

  const { supabase, user, error } = await assertWorkspaceAccess(workspace_id);
  if (error || !user) return error!;

  const { data: newRound, error: createError } = await (supabase as any)
    .schema('fundraising')
    .from('rounds')
    .insert({
      workspace_id,
      round_name,
      round_type,
      target_amount: target,
      raised_amount: raised_amount ?? raisedAmount ?? 0,
      valuation: valuation || null,
      currency: currency || 'USD',
      status: status || 'active',
      start_date: start_date ?? startDate ?? null,
      close_date: close_date ?? closeDate ?? null,
      owner_id: user.id,
      description: description ?? null,
      tags,
      custom_fields,
      created_by: user.id,
      updated_by: user.id,
    })
    .select('*')
    .single();

  if (createError) {
    console.error('Create funding round error:', createError);
    return NextResponse.json(
      { success: false, message: 'Failed to create funding round' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: 'Funding round created successfully', data: newRound }, { status: 201 });
});

export const updateRoundController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body?.id || !(body.workspace_id ?? body.workspaceId)) return NextResponse.json({ success: false, message: 'id and workspace_id are required' }, { status: 400 });

  const workspaceId = body.workspace_id ?? body.workspaceId;
  const { supabase, user, error } = await assertWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const payload = {
    round_name: body.round_name ?? body.roundName,
    round_type: body.round_type ?? body.roundType,
    target_amount: body.target_amount ?? body.targetAmount,
    raised_amount: body.raised_amount ?? body.raisedAmount,
    valuation: body.valuation,
    currency: body.currency,
    status: body.status,
    start_date: body.start_date ?? body.startDate,
    close_date: body.close_date ?? body.closeDate,
    description: body.description,
    tags: body.tags,
    custom_fields: body.custom_fields ?? body.customFields,
    updated_by: user.id,
  };

  Object.keys(payload).forEach((key) => (payload as Record<string, unknown>)[key] === undefined && delete (payload as Record<string, unknown>)[key]);

  const { data, error: updateError } = await (supabase as any).schema('fundraising').from('rounds').update(payload).eq('workspace_id', workspaceId).eq('id', body.id).select('*').single();
  if (updateError) return NextResponse.json({ success: false, message: 'Failed to update funding round' }, { status: 500 });
  return successDataResponse('Funding round updated successfully', data);
});

export const deleteRoundController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const workspaceId = url.searchParams.get('workspaceId');
  if (!id || !workspaceId) return NextResponse.json({ success: false, message: 'id and workspaceId are required' }, { status: 400 });

  const { supabase, user, error } = await assertWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const { error: deleteError } = await (supabase as any).schema('fundraising').from('rounds').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id }).eq('workspace_id', workspaceId).eq('id', id);
  if (deleteError) return NextResponse.json({ success: false, message: 'Failed to delete funding round' }, { status: 500 });
  return successDataResponse('Funding round deleted successfully', { id });
});
