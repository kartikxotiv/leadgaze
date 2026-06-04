import { NextResponse } from 'next/server';

import { assertCoreWorkspaceAccess } from '../_shared/workspace-access';
import { catchAsync, successDataResponse } from '../../utils/response-handler';

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

export const getCoreEmailTemplatesController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId') ?? url.searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ success: false, message: 'workspaceId is required' }, { status: 400 });
  }

  const { supabase, user, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const { data, error: fetchError } = await (supabase as any)
    .schema('core')
    .from('email_templates')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (fetchError) throw fetchError;

  return successDataResponse('Email templates retrieved successfully', data ?? []);
});

export const saveCoreEmailTemplateController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;

  if (!workspaceId || !body?.name || !body?.subject || !body?.html_body) {
    return NextResponse.json({ success: false, message: 'workspace_id, name, subject, and html_body are required' }, { status: 400 });
  }

  const { supabase, user, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const payload: Record<string, unknown> = {
    workspace_id: workspaceId,
    name: body.name,
    slug: body.slug ?? slugify(body.name),
    subject: body.subject,
    html_body: body.html_body,
    text_body: body.text_body ?? null,
    variables: body.variables ?? [],
    updated_by: user.id,
  };

  if (body.id) {
    payload.id = body.id;
  } else {
    payload.created_by = user.id;
  }

  const { data, error: saveError } = await (supabase as any)
    .schema('core')
    .from('email_templates')
    .upsert(payload)
    .select('*')
    .single();

  if (saveError) throw saveError;

  return successDataResponse('Email template saved successfully', data);
});

export const deleteCoreEmailTemplateController = catchAsync(async ({ request }) => {
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
    .from('email_templates')
    .delete()
    .eq('id', Number(id))
    .eq('workspace_id', workspaceId);

  if (deleteError) throw deleteError;

  return successDataResponse('Email template deleted successfully', { id: Number(id) });
});
