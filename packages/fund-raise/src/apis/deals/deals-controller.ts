'use server';

import { NextResponse } from 'next/server';
import { catchAsync, successDataResponse } from '../../utils';
import { assertWorkspaceAccess } from '../_shared/workspace-access';

export const getDealsController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const id = url.searchParams.get('id');
  const investorId = url.searchParams.get('investorId');
  const roundId = url.searchParams.get('roundId');
  if (!workspaceId) return NextResponse.json({ success: false, message: 'workspaceId query parameter is required' }, { status: 400 });
  const { supabase, error } = await assertWorkspaceAccess(workspaceId);
  if (error) return error;
  let query = (supabase as any).schema('fundraising').from('deals').select('*').eq('workspace_id', workspaceId).eq('is_deleted', false);
  if (id) query = query.eq('id', id).maybeSingle();
  else {
    if (investorId) query = query.eq('investor_id', investorId);
    if (roundId) query = query.eq('round_id', roundId);
    query = query.order('created_at', { ascending: false });
  }
  const { data, error: fetchError } = await query;
  if (fetchError) return NextResponse.json({ success: false, message: 'Failed to retrieve deals' }, { status: 500 });
  return successDataResponse('Deals retrieved successfully', data ?? (id ? null : []));
});

export const createDealController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
  const { workspace_id, investor_id, round_id, stage_id, status = 'active', probability = 0, expected_amount, currency = 'USD', last_contact_date, next_followup_date, notes, owner_id, tags = [], custom_fields = {} } = body;
  if (!workspace_id || !investor_id || !stage_id) return NextResponse.json({ success: false, message: 'workspace_id, investor_id, and stage_id are required' }, { status: 400 });
  const { supabase, user, error } = await assertWorkspaceAccess(workspace_id);
  if (error || !user) return error!;
  const { data, error: insertError } = await (supabase as any).schema('fundraising').from('deals').insert({ workspace_id, investor_id, round_id: round_id ?? null, stage_id, status, probability, expected_amount: expected_amount ?? null, currency, last_contact_date: last_contact_date ?? null, next_followup_date: next_followup_date ?? null, notes: notes ?? null, owner_id: owner_id ?? user.id, tags, custom_fields, created_by: user.id, updated_by: user.id }).select('*').single();
  if (insertError) return NextResponse.json({ success: false, message: 'Failed to create deal' }, { status: 500 });
  return NextResponse.json({ success: true, message: 'Deal created successfully', data }, { status: 201 });
});

export const updateDealController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;
  if (!body?.id || !workspaceId) return NextResponse.json({ success: false, message: 'id and workspace_id are required' }, { status: 400 });
  const { supabase, user, error } = await assertWorkspaceAccess(workspaceId);
  if (error || !user) return error!;
  const payload = {
    investor_id: body.investor_id ?? body.investorId,
    round_id: body.round_id ?? body.roundId,
    stage_id: body.stage_id ?? body.stageId,
    status: body.status,
    probability: body.probability,
    expected_amount: body.expected_amount ?? body.expectedAmount,
    currency: body.currency,
    last_contact_date: body.last_contact_date ?? body.lastContactDate,
    next_followup_date: body.next_followup_date ?? body.nextFollowupDate,
    notes: body.notes,
    owner_id: body.owner_id ?? body.ownerId,
    tags: body.tags,
    custom_fields: body.custom_fields ?? body.customFields,
    updated_by: user.id,
  };
  Object.keys(payload).forEach((key) => (payload as Record<string, unknown>)[key] === undefined && delete (payload as Record<string, unknown>)[key]);
  const { data, error: updateError } = await (supabase as any).schema('fundraising').from('deals').update(payload).eq('workspace_id', workspaceId).eq('id', body.id).select('*').single();
  if (updateError) return NextResponse.json({ success: false, message: 'Failed to update deal' }, { status: 500 });
  return successDataResponse('Deal updated successfully', data);
});

export const deleteDealController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const workspaceId = url.searchParams.get('workspaceId');
  if (!id || !workspaceId) return NextResponse.json({ success: false, message: 'id and workspaceId are required' }, { status: 400 });
  const { supabase, user, error } = await assertWorkspaceAccess(workspaceId);
  if (error || !user) return error!;
  const { error: deleteError } = await (supabase as any).schema('fundraising').from('deals').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id }).eq('workspace_id', workspaceId).eq('id', id);
  if (deleteError) return NextResponse.json({ success: false, message: 'Failed to delete deal' }, { status: 500 });
  return successDataResponse('Deal deleted successfully', { id });
});
