import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { enhanceRouteHandler } from '@kit/next/routes';
import { catchAsync, successDataResponse } from '~/utils/response-handler';
import { createEntitlementService } from '~/lib/entitlements';

export const GET = enhanceRouteHandler(
  catchAsync(async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient() as any;
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ message: 'workspaceId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .schema('core')
      .from('connectors')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return successDataResponse('Connectors retrieved', data || []);
  }),
  { auth: true }
);

export const POST = enhanceRouteHandler(
  catchAsync(async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient() as any;
    const body = await request.json();
    const { 
      workspace_id, 
      name, 
      destination_module, 
      destination_entity, 
      default_owner_id,
      type
    } = body;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formReservation = await createEntitlementService().reserveUsage({
      workspaceId: workspace_id,
      moduleKey: 'sales',
      featureKey: 'sales.website_forms',
      resourceType: 'website_form',
    });

    // 1. Create connector
    const { data: connData, error: connErr } = await supabase
      .schema('core')
      .from('connectors')
      .insert({
        workspace_id,
        name,
        status: 'active',
        type: type || 'website',
        destination_module,
        destination_entity,
        default_owner_id: default_owner_id || null,
        destination_config: {
          success_message: 'Success',
          redirect_url: '',
          spam_protection: true,
          lead_status: 'new',
          ticket_priority: 'medium'
        },
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single();

    if (connErr) {
      await formReservation.rollback();
      throw connErr;
    }

    // 2. Create default form for embedded forms
    const { data: formData, error: formErr } = await supabase
      .schema('core')
      .from('connector_forms')
      .insert({
        connector_id: connData.id,
        workspace_id,
        name: `${name} Form`,
        success_message: 'Thank you for your submission!',
        redirect_url: '',
        spam_protection_enabled: true
      })
      .select()
      .single();

    if (formErr) {
      await formReservation.rollback();
      throw formErr;
    }

    await formReservation.commit({ resourceId: formData.id });

    // 3. Create default fields
    const defaultFields = [
      { field_name: 'name', label: 'Full Name', field_type: 'text', is_required: true, sort_order: 1 },
      { field_name: 'email', label: 'Email Address', field_type: 'text', is_required: true, sort_order: 2 },
      { field_name: 'phone', label: 'Phone Number', field_type: 'text', is_required: false, sort_order: 3 },
      { field_name: 'company', label: 'Company Name', field_type: 'text', is_required: false, sort_order: 4 },
      { field_name: 'message', label: 'Message', field_type: 'textarea', is_required: true, sort_order: 5 },
    ].map((field, idx) => ({
      form_id: formData.id,
      workspace_id,
      field_name: field.field_name,
      label: field.label,
      field_type: field.field_type,
      is_required: field.is_required,
      sort_order: idx + 1
    }));

    const { error: fieldsErr } = await supabase
      .schema('core')
      .from('connector_form_fields')
      .insert(defaultFields);

    if (fieldsErr) throw fieldsErr;

    // 4. Generate API Keys
    const randHex = () => Math.random().toString(16).substring(2, 10);
    const pubKey = `pk_live_${randHex()}${randHex()}`;
    const secretRaw = `sk_live_${randHex()}${randHex()}${randHex()}`;
    
    const { error: keysErr } = await supabase
      .schema('core')
      .from('connector_api_keys')
      .insert({
        connector_id: connData.id,
        workspace_id,
        public_key: pubKey,
        hashed_secret_key: secretRaw,
        masked_secret_key: `${secretRaw.substring(0, 12)}...${secretRaw.substring(secretRaw.length - 4)}`
      });

    if (keysErr) throw keysErr;

    return successDataResponse('Connector created successfully', connData);
  }),
  { auth: true }
);
