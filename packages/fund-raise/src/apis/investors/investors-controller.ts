'use server';

import { NextResponse } from 'next/server';
import { catchAsync, successDataResponse } from '../../utils';
import { assertWorkspaceAccess } from '../_shared/workspace-access';

export const getInvestorsController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const id = url.searchParams.get('id');
  if (!workspaceId) return NextResponse.json({ success: false, message: 'workspaceId query parameter is required' }, { status: 400 });

  const { supabase, error } = await assertWorkspaceAccess(workspaceId);
  if (error) return error;

  let query = (supabase as any).schema('fundraising').from('investors').select('*').eq('workspace_id', workspaceId).eq('is_deleted', false);
  if (id) query = query.eq('id', id).maybeSingle();
  else query = query.order('created_at', { ascending: false });

  const { data, error: fetchError } = await query;
  if (fetchError) return NextResponse.json({ success: false, message: 'Failed to retrieve investors' }, { status: 500 });
  return successDataResponse('Investors retrieved successfully', data ?? (id ? null : []));
});

export const createInvestorController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
  const workspace_id = body.workspace_id ?? body.workspaceId;
  const name = body.name ?? body.investor_name;
  const investor_type = body.investor_type ?? body.investorType ?? null;
  const ticket_size_min = body.ticket_size_min ?? body.ticketSizeMin ?? null;
  const ticket_size_max = body.ticket_size_max ?? body.ticketSizeMax ?? null;
  const currency = body.currency ?? 'USD';
  const industry_focus = body.industry_focus ?? body.industryFocus ?? [];
  const geo_focus = body.geo_focus ?? body.geoFocus ?? [];
  const website = body.website ?? null;
  const linkedin_url = body.linkedin_url ?? body.linkedinUrl ?? null;
  const description = body.description ?? null;
  const status = body.status ?? 'active';
  const owner_id = body.owner_id ?? body.ownerId ?? null;
  const tags = body.tags ?? [];
  const custom_fields = body.custom_fields ?? body.customFields ?? {};

  if (!workspace_id || !name) return NextResponse.json({ success: false, message: 'workspace_id and name are required' }, { status: 400 });

  const { supabase, user, error } = await assertWorkspaceAccess(workspace_id);
  if (error || !user) return error!;

  const { data, error: insertError } = await (supabase as any).schema('fundraising').from('investors').insert({
    workspace_id,
    name,
    investor_type,
    ticket_size_min,
    ticket_size_max,
    currency,
    industry_focus,
    geo_focus,
    website,
    linkedin_url,
    description,
    status,
    owner_id: owner_id ?? user.id,
    tags,
    custom_fields,
    created_by: user.id,
    updated_by: user.id,
  }).select('*').single();
  if (insertError) return NextResponse.json({ success: false, message: 'Failed to create investor' }, { status: 500 });
  return NextResponse.json({ success: true, message: 'Investor created successfully', data }, { status: 201 });
});

export const updateInvestorController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;
  if (!body?.id || !workspaceId) return NextResponse.json({ success: false, message: 'id and workspace_id are required' }, { status: 400 });

  const { supabase, user, error } = await assertWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const payload = {
    name: body.name ?? body.investor_name,
    investor_type: body.investor_type ?? body.investorType,
    ticket_size_min: body.ticket_size_min ?? body.ticketSizeMin,
    ticket_size_max: body.ticket_size_max ?? body.ticketSizeMax,
    currency: body.currency,
    industry_focus: body.industry_focus ?? body.industryFocus,
    geo_focus: body.geo_focus ?? body.geoFocus,
    website: body.website,
    linkedin_url: body.linkedin_url ?? body.linkedinUrl,
    description: body.description,
    status: body.status,
    owner_id: body.owner_id ?? body.ownerId,
    tags: body.tags,
    custom_fields: body.custom_fields ?? body.customFields,
    updated_by: user.id,
  };
  Object.keys(payload).forEach((key) => (payload as Record<string, unknown>)[key] === undefined && delete (payload as Record<string, unknown>)[key]);

  const { data, error: updateError } = await (supabase as any).schema('fundraising').from('investors').update(payload).eq('workspace_id', workspaceId).eq('id', body.id).select('*').single();
  if (updateError) return NextResponse.json({ success: false, message: 'Failed to update investor' }, { status: 500 });
  return successDataResponse('Investor updated successfully', data);
});

export const deleteInvestorController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const workspaceId = url.searchParams.get('workspaceId');
  if (!id || !workspaceId) return NextResponse.json({ success: false, message: 'id and workspaceId are required' }, { status: 400 });

  const { supabase, user, error } = await assertWorkspaceAccess(workspaceId);
  if (error || !user) return error!;
  const { error: deleteError } = await (supabase as any).schema('fundraising').from('investors').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id }).eq('workspace_id', workspaceId).eq('id', id);
  if (deleteError) return NextResponse.json({ success: false, message: 'Failed to delete investor' }, { status: 500 });
  return successDataResponse('Investor deleted successfully', { id });
});
