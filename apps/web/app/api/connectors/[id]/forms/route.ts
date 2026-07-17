import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { enhanceRouteHandler } from '@kit/next/routes';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

export const PATCH = enhanceRouteHandler(
  catchAsync(async ({ request, params }: { request: NextRequest; params?: Record<string, string> }) => {
    const supabase = getSupabaseServerClient() as any;
    const id = params?.id; // Connector ID
    const body = await request.json();
    const { success_message, redirect_url, spam_protection_enabled, button_color, heading, subheading, fields } = body;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch form
    const { data: activeForm, error: formFetchErr } = await supabase
      .schema('core')
      .from('connector_forms')
      .select('id, workspace_id')
      .eq('connector_id', id)
      .single();

    if (formFetchErr) throw formFetchErr;

    // 2. Update form details
    const { error: formUpdateErr } = await supabase
      .schema('core')
      .from('connector_forms')
      .update({
        success_message,
        redirect_url,
        spam_protection_enabled,
        button_color: button_color || '#4f46e5',
        heading: heading || 'Contact Us',
        subheading: subheading || 'Please fill out the form below to get in touch.',
        updated_at: new Date().toISOString()
      })
      .eq('id', activeForm.id);

    if (formUpdateErr) throw formUpdateErr;

    // 3. Clear old fields and rewrite
    await supabase
      .schema('core')
      .from('connector_form_fields')
      .delete()
      .eq('form_id', activeForm.id);

    if (fields && fields.length > 0) {
      const newFields = fields.map((field: any, idx: number) => ({
        form_id: activeForm.id,
        workspace_id: activeForm.workspace_id,
        field_name: field.field_name,
        label: field.label,
        field_type: field.field_type,
        is_required: !!field.is_required,
        sort_order: idx + 1
      }));

      const { error: fieldsErr } = await supabase
        .schema('core')
        .from('connector_form_fields')
        .insert(newFields);

      if (fieldsErr) throw fieldsErr;
    }

    return successDataResponse('Form configuration saved successfully');
  }),
  { auth: true }
);
