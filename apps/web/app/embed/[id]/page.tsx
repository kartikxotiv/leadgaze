import { notFound } from 'next/navigation';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { WebsiteConnectorEmbedPage } from '@kit/integration-website/pages';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmbedPage({ params }: PageProps) {
  const resolvedParams = await params;
  const formId = resolvedParams.id;

  if (!formId) {
    notFound();
  }

  const supabase = getSupabaseServerAdminClient() as any;

  // 1. Fetch Form Definition
  const { data: form, error: formErr } = await supabase
    .schema('core')
    .from('connector_forms')
    .select('id, connector_id, workspace_id, success_message, redirect_url, button_color, heading, subheading')
    .eq('id', formId)
    .maybeSingle();

  if (formErr || !form) {
    notFound();
  }

  // 2. Fetch Form Fields
  const { data: fields, error: fieldsErr } = await supabase
    .schema('core')
    .from('connector_form_fields')
    .select('field_name, label, field_type, is_required, sort_order')
    .eq('form_id', formId)
    .order('sort_order', { ascending: true });

  if (fieldsErr) {
    throw fieldsErr;
  }

  // 3. Fetch API Key for submit authentication
  const { data: apiKey, error: keyErr } = await supabase
    .schema('core')
    .from('connector_api_keys')
    .select('public_key')
    .eq('connector_id', form.connector_id)
    .limit(1)
    .maybeSingle();

  if (keyErr || !apiKey) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-transparent p-4 flex items-center justify-center">
      <WebsiteConnectorEmbedPage
        form={{
          id: form.id,
          heading: form.heading || 'Contact Us',
          subheading: form.subheading || 'Please fill out the form below to get in touch.',
          button_color: form.button_color || '#4f46e5',
          success_message: form.success_message || 'Thank you for your submission!',
          redirect_url: form.redirect_url || ''
        }}
        publicKey={apiKey.public_key}
        fields={fields || []}
      />
    </div>
  );
}
