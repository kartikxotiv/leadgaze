'use server';

import { NextResponse } from 'next/server';
import { catchAsync, successDataResponse } from '../../utils';
import { assertWorkspaceAccess } from '../_shared/workspace-access';

export const getCommitmentsController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const dealId = url.searchParams.get('dealId');
  if (!workspaceId) return NextResponse.json({ success: false, message: 'workspaceId query parameter is required' }, { status: 400 });
  const { supabase, error } = await assertWorkspaceAccess(workspaceId);
  if (error) return error;
  let query = (supabase as any).schema('fundraising').from('commitments').select('*').eq('workspace_id', workspaceId);
  if (dealId) query = query.eq('deal_id', dealId);
  const { data, error: fetchError } = await query.order('created_at', { ascending: false });
  if (fetchError) return NextResponse.json({ success: false, message: 'Failed to retrieve commitments' }, { status: 500 });
  return successDataResponse('Commitments retrieved successfully', data || []);
});

export const createCommitmentController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
  const { workspace_id, deal_id, promised_amount, received_amount = 0, currency = 'USD', status = 'pending', commitment_date, expected_close_date, received_date, notes } = body;
  if (!workspace_id || !deal_id || promised_amount == null) return NextResponse.json({ success: false, message: 'workspace_id, deal_id, and promised_amount are required' }, { status: 400 });
  const { supabase, user, error } = await assertWorkspaceAccess(workspace_id);
  if (error || !user) return error!;
  const { data, error: insertError } = await (supabase as any).schema('fundraising').from('commitments').insert({ workspace_id, deal_id, promised_amount, received_amount, currency, status, commitment_date: commitment_date ?? null, expected_close_date: expected_close_date ?? null, received_date: received_date ?? null, notes: notes ?? null, created_by: user.id, updated_by: user.id }).select('*').single();
  if (insertError) return NextResponse.json({ success: false, message: 'Failed to create commitment' }, { status: 500 });
  return NextResponse.json({ success: true, message: 'Commitment created successfully', data }, { status: 201 });
});

export const updateCommitmentController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;
  if (!body?.id || !workspaceId) return NextResponse.json({ success: false, message: 'id and workspace_id are required' }, { status: 400 });
  const { supabase, user, error } = await assertWorkspaceAccess(workspaceId);
  if (error || !user) return error!;
  const payload = {
    deal_id: body.deal_id ?? body.dealId,
    promised_amount: body.promised_amount ?? body.promisedAmount,
    received_amount: body.received_amount ?? body.receivedAmount,
    currency: body.currency,
    status: body.status,
    commitment_date: body.commitment_date ?? body.commitmentDate,
    expected_close_date: body.expected_close_date ?? body.expectedCloseDate,
    received_date: body.received_date ?? body.receivedDate,
    notes: body.notes,
    updated_by: user.id,
  };
  Object.keys(payload).forEach((key) => (payload as Record<string, unknown>)[key] === undefined && delete (payload as Record<string, unknown>)[key]);
  const { data, error: updateError } = await (supabase as any).schema('fundraising').from('commitments').update(payload).eq('workspace_id', workspaceId).eq('id', body.id).select('*').single();
  if (updateError) return NextResponse.json({ success: false, message: 'Failed to update commitment' }, { status: 500 });
  return successDataResponse('Commitment updated successfully', data);
});

export const deleteCommitmentController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const workspaceId = url.searchParams.get('workspaceId');
  if (!id || !workspaceId) return NextResponse.json({ success: false, message: 'id and workspaceId are required' }, { status: 400 });
  const { supabase, error } = await assertWorkspaceAccess(workspaceId);
  if (error) return error;
  const { error: deleteError } = await (supabase as any).schema('fundraising').from('commitments').delete().eq('workspace_id', workspaceId).eq('id', id);
  if (deleteError) return NextResponse.json({ success: false, message: 'Failed to delete commitment' }, { status: 500 });
  return successDataResponse('Commitment deleted successfully', { id });
});
