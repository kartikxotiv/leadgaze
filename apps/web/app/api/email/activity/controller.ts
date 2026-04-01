/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
  successListDataResponse,
} from '~/utils/response-handler';

export const getEmailActivity = catchAsync(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get('entityId');
  const entityType = searchParams.get('entityType');

  if (!entityId || !entityType) {
    return NextResponse.json(
      { error: 'Missing entityId or entityType' },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();

  const { data: emails, error } = await supabase
    .from('emails')
    .select('*')
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return successListDataResponse(emails, { object: 'email_activity' });
});

export const saveEmailActivity = catchAsync(async ({ request }) => {
  const payload: any = await request.json();
  const {
    id,
    workspace_id,
    entity_id,
    entity_type,
    subject,
    body,
    to_emails,
    cc_emails,
    bcc_emails,
    status,
    scheduled_at,
    from_email,
  } = payload;

  if (!workspace_id || !entity_id || !entity_type) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();

  const upsertData: any = {
    workspace_id,
    entity_id,
    entity_type,
    subject,
    html_body: body,
    to_emails,
    cc_emails: Array.isArray(cc_emails) ? cc_emails.join(', ') : cc_emails,
    bcc_emails: Array.isArray(bcc_emails) ? bcc_emails.join(', ') : bcc_emails,
    status: status || 'draft',
    scheduled_at: scheduled_at || null,
    from_email,
    direction: 'outbound',
  };

  if (id && !id.includes('.')) {
    upsertData.id = id;
  }

  const { data: email, error } = await supabase
    .from('emails')
    .upsert(upsertData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return successDataResponse(email);
});

export const deleteEmailActivity = catchAsync(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from('emails').delete().eq('id', id);

  if (error) {
    throw error;
  }

  return successDataResponse('Email activity deleted successfully');
});
