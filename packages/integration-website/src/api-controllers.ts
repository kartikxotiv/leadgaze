import { NextResponse } from 'next/server';

function setCorsHeaders(res: NextResponse, methods: string, headers: string) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', methods);
  res.headers.set('Access-Control-Allow-Headers', headers);
  return res;
}

export function handleFormOptions() {
  const res = new NextResponse(null, { status: 200 });
  return setCorsHeaders(res, 'GET, OPTIONS', 'Content-Type');
}

export function handleSubmitOptions() {
  const res = new NextResponse(null, { status: 200 });
  return setCorsHeaders(res, 'POST, OPTIONS', 'Content-Type, X-Connector-Public-Key');
}

export async function handleGetForm(
  request: Request,
  formId: string | undefined,
  supabase: any
) {
  try {
    if (!formId) {
      const res = NextResponse.json({
        success: false,
        message: 'Form ID is required',
        statusCode: 400,
        data: null
      }, { status: 400 });
      return setCorsHeaders(res, 'GET, OPTIONS', 'Content-Type');
    }

    // 1. Fetch Form Definition
    const { data: form, error: formErr } = await supabase
      .schema('core')
      .from('connector_forms')
      .select('id, connector_id, workspace_id, success_message, redirect_url, button_color, heading, subheading')
      .eq('id', formId)
      .maybeSingle();

    if (formErr || !form) {
      const res = NextResponse.json({
        success: false,
        message: 'Form not found',
        statusCode: 404,
        data: null
      }, { status: 404 });
      return setCorsHeaders(res, 'GET, OPTIONS', 'Content-Type');
    }

    // 2. Fetch Form Fields
    const { data: fields, error: fieldsErr } = await supabase
      .schema('core')
      .from('connector_form_fields')
      .select('field_name, label, field_type, is_required, sort_order')
      .eq('form_id', formId)
      .order('sort_order', { ascending: true });

    if (fieldsErr) throw fieldsErr;

    // 3. Fetch API Key for submit authentication
    const { data: apiKey, error: keyErr } = await supabase
      .schema('core')
      .from('connector_api_keys')
      .select('public_key')
      .eq('connector_id', form.connector_id)
      .limit(1)
      .maybeSingle();

    if (keyErr || !apiKey) {
      const res = NextResponse.json({
        success: false,
        message: 'Connector credentials not resolved',
        statusCode: 404,
        data: null
      }, { status: 404 });
      return setCorsHeaders(res, 'GET, OPTIONS', 'Content-Type');
    }

    const res = NextResponse.json({
      success: true,
      statusCode: 200,
      message: 'Form resolved successfully',
      data: {
        form: {
          id: form.id,
          heading: form.heading || 'Contact Us',
          subheading: form.subheading || 'Please fill out the form below to get in touch.',
          button_color: form.button_color || '#4f46e5',
          success_message: form.success_message || 'Thank you for your submission!',
          redirect_url: form.redirect_url
        },
        publicKey: apiKey.public_key,
        fields: fields || []
      }
    }, { status: 200 });
    return setCorsHeaders(res, 'GET, OPTIONS', 'Content-Type');
  } catch (err: any) {
    console.error('Fetch Form API error:', err);
    const res = NextResponse.json(
      {
        success: false,
        message: err.message || 'Internal Server Error',
        statusCode: 500,
        data: null
      },
      { status: 500 }
    );
    return setCorsHeaders(res, 'GET, OPTIONS', 'Content-Type');
  }
}

export async function handleFormSubmit(
  request: Request,
  publicKey: string | null,
  processWebsiteSubmission: any,
  supabase: any
) {
  try {
    if (!publicKey) {
      const res = NextResponse.json(
        {
          success: false,
          message: 'X-Connector-Public-Key header is required',
          statusCode: 400,
          data: null
        },
        { status: 400 }
      );
      return setCorsHeaders(res, 'POST, OPTIONS', 'Content-Type, X-Connector-Public-Key');
    }

    // 1. Resolve API key → connector + workspace
    const { data: keyData, error: keyErr } = await supabase
      .schema('core')
      .from('connector_api_keys')
      .select('connector_id, workspace_id')
      .eq('public_key', publicKey)
      .maybeSingle();

    if (keyErr || !keyData) {
      const res = NextResponse.json(
        {
          success: false,
          message: 'Invalid API credentials',
          statusCode: 401,
          data: null
        },
        { status: 401 }
      );
      return setCorsHeaders(res, 'POST, OPTIONS', 'Content-Type, X-Connector-Public-Key');
    }

    const { connector_id, workspace_id } = keyData;

    // 2. Fetch active connector
    const { data: connector, error: connErr } = await supabase
      .schema('core')
      .from('connectors')
      .select('*')
      .eq('id', connector_id)
      .eq('status', 'active')
      .maybeSingle();

    if (connErr || !connector) {
      const res = NextResponse.json(
        {
          success: false,
          message: 'Connector is inactive or not found',
          statusCode: 404,
          data: null
        },
        { status: 404 }
      );
      return setCorsHeaders(res, 'POST, OPTIONS', 'Content-Type, X-Connector-Public-Key');
    }

    // 3. Parse body and delegate all ingestion logic
    const rawPayload = await request.json();

    const result = await processWebsiteSubmission(supabase, {
      connector,
      workspace_id,
      raw_payload: rawPayload,
      source: 'api',
    });

    const res = NextResponse.json({
      success: true,
      statusCode: 200,
      message: 'Payload ingested successfully',
      data: {
        status: result.status,
        message: result.message,
      }
    }, { status: 200 });
    return setCorsHeaders(res, 'POST, OPTIONS', 'Content-Type, X-Connector-Public-Key');
  } catch (err: any) {
    console.error('[/api/v1/connectors/website/submit] Error:', err);
    const res = NextResponse.json(
      {
        success: false,
        message: err.message || 'Internal Server Error',
        statusCode: 500,
        data: null,
      },
      { status: 500 }
    );
    return setCorsHeaders(res, 'POST, OPTIONS', 'Content-Type, X-Connector-Public-Key');
  }
}
