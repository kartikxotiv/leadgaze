'use server';

import { NextResponse } from 'next/server';
import { catchAsync, successDataResponse } from '../../utils/response-handler';
import { assertFundraisingPermission } from '../_shared/permissions';
import { assertWorkspaceAccess } from '../_shared/workspace-access';

export const getInvestorContactsController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const investorId = url.searchParams.get('investorId');
  if (!workspaceId) return NextResponse.json({ success: false, message: 'workspaceId query parameter is required' }, { status: 400 });

  const { supabase, user, error } = await assertWorkspaceAccess(workspaceId);
  if (error || !user) return error!;
  await assertFundraisingPermission({ supabase, userId: user.id, workspaceId, moduleKey: 'fundraising_investors', featureKey: 'view' });

  let query = (supabase as any).schema('fundraising').from('investor_contacts').select('*').eq('workspace_id', workspaceId);
  if (investorId) query = query.eq('investor_id', investorId);
  const { data, error: fetchError } = await query.order('created_at', { ascending: false });
  if (fetchError) return NextResponse.json({ success: false, message: 'Failed to retrieve investor contacts' }, { status: 500 });
  return successDataResponse('Investor contacts retrieved successfully', data || []);
});

export const createInvestorContactController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
  const { workspace_id, investor_id, name, email, phone, designation, linkedin_url, is_primary = false } = body;
  if (!workspace_id || !investor_id || !name) return NextResponse.json({ success: false, message: 'workspace_id, investor_id, and name are required' }, { status: 400 });

  const { supabase, user, error } = await assertWorkspaceAccess(workspace_id);
  if (error || !user) return error!;
  await assertFundraisingPermission({ supabase, userId: user.id, workspaceId: workspace_id, moduleKey: 'fundraising_investors', featureKey: 'add_contact' });

  const { data, error: insertError } = await (supabase as any).schema('fundraising').from('investor_contacts').insert({ workspace_id, investor_id, name, email: email ?? null, phone: phone ?? null, designation: designation ?? null, linkedin_url: linkedin_url ?? null, is_primary, created_by: user.id, updated_by: user.id }).select('*').single();
  if (insertError) return NextResponse.json({ success: false, message: 'Failed to create investor contact' }, { status: 500 });
  return NextResponse.json({ success: true, message: 'Investor contact created successfully', data }, { status: 201 });
});

export const updateInvestorContactController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;
  if (!body?.id || !workspaceId) return NextResponse.json({ success: false, message: 'id and workspace_id are required' }, { status: 400 });
  const { supabase, user, error } = await assertWorkspaceAccess(workspaceId);
  if (error || !user) return error!;
  await assertFundraisingPermission({ supabase, userId: user.id, workspaceId, moduleKey: 'fundraising_investors', featureKey: 'edit' });
  const payload = {
    investor_id: body.investor_id ?? body.investorId,
    name: body.name,
    email: body.email,
    phone: body.phone,
    designation: body.designation,
    linkedin_url: body.linkedin_url ?? body.linkedinUrl,
    is_primary: body.is_primary ?? body.isPrimary,
    updated_by: user.id,
  };
  Object.keys(payload).forEach((key) => (payload as Record<string, unknown>)[key] === undefined && delete (payload as Record<string, unknown>)[key]);
  const { data, error: updateError } = await (supabase as any).schema('fundraising').from('investor_contacts').update(payload).eq('workspace_id', workspaceId).eq('id', body.id).select('*').single();
  if (updateError) return NextResponse.json({ success: false, message: 'Failed to update investor contact' }, { status: 500 });
  return successDataResponse('Investor contact updated successfully', data);
});

export const deleteInvestorContactController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const workspaceId = url.searchParams.get('workspaceId');
  if (!id || !workspaceId) return NextResponse.json({ success: false, message: 'id and workspaceId are required' }, { status: 400 });
  const { supabase, user, error } = await assertWorkspaceAccess(workspaceId);
  if (error || !user) return error!;
  await assertFundraisingPermission({ supabase, userId: user.id, workspaceId, moduleKey: 'fundraising_investors', featureKey: 'delete' });
  const { error: deleteError } = await (supabase as any).schema('fundraising').from('investor_contacts').delete().eq('workspace_id', workspaceId).eq('id', id);
  if (deleteError) return NextResponse.json({ success: false, message: 'Failed to delete investor contact' }, { status: 500 });
  return successDataResponse('Investor contact deleted successfully', { id });
});
