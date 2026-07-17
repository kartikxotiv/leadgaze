import { NextResponse } from 'next/server';
import { createZapierLog } from './zapier-provider';
import {
  resolveDefaultLeadStatusId,
  resolveCreatorId,
  resolveOrCreateLeadSource,
} from '@kit/integration-website';

function setCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Zapier-Api-Key');
  return res;
}

export function handleZapierOptions() {
  const res = new NextResponse(null, { status: 200 });
  return setCorsHeaders(res);
}

export async function handleZapierSubmit(
  request: Request,
  apiKey: string | null,
  supabase: any
) {
  let workspaceId = '';
  let actionType = 'Unknown Action';

  try {
    if (!apiKey) {
      const res = NextResponse.json(
        { success: false, message: 'X-Zapier-Api-Key header is required', statusCode: 401 },
        { status: 401 }
      );
      return setCorsHeaders(res);
    }

    // 1. Authenticate API key
    const { data: keyData, error: keyErr } = await supabase
      .schema('core')
      .from('zapier_api_keys')
      .select('workspace_id, status')
      .eq('api_key', apiKey)
      .eq('status', 'active')
      .maybeSingle();

    if (keyErr || !keyData) {
      const res = NextResponse.json(
        { success: false, message: 'Invalid or inactive Zapier API credentials', statusCode: 401 },
        { status: 401 }
      );
      return setCorsHeaders(res);
    }

    workspaceId = keyData.workspace_id;

    // 2. Validate Integration status
    const { data: integration, error: intErr } = await supabase
      .schema('core')
      .from('zapier_integrations')
      .select('status')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (intErr || !integration || integration.status !== 'active') {
      const res = NextResponse.json(
        { success: false, message: 'Zapier integration is currently disabled for this workspace', statusCode: 403 },
        { status: 403 }
      );
      return setCorsHeaders(res);
    }

    // 3. Process actions
    const rawBody = await request.json();
    const action = rawBody.action;
    const payload = rawBody.payload || {};
    actionType = action || 'Unknown Action';

    if (!action) {
      const res = NextResponse.json(
        { success: false, message: 'action property is required in request body', statusCode: 400 },
        { status: 400 }
      );
      await createZapierLog(supabase, {
        workspace_id: workspaceId,
        request_type: actionType,
        status: 'Failed',
        message: 'Request body missing action name',
      });
      return setCorsHeaders(res);
    }

    // --- Lead Actions ---
    if (action === 'create_lead') {
      const name = payload.name || '';
      const email = payload.email || '';
      const phone = payload.phone || payload.phone_number || '';
      const company = payload.company || payload.company_name || '';
      const notes = payload.notes || payload.message || '';

      if (!name || (!email && !phone)) {
        throw new Error('Name and at least one contact method (Email or Phone) are required.');
      }

      // Check duplicate
      if (email) {
        const { data: duplicate } = await supabase
          .from('crm_leads')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('email', email)
          .maybeSingle();
        if (duplicate) {
          const res = NextResponse.json({
            success: true,
            message: 'Duplicate lead detected. Lead already exists.',
            data: { id: duplicate.id, duplicate: true },
          });
          await createZapierLog(supabase, {
            workspace_id: workspaceId,
            request_type: actionType,
            status: 'Success',
            message: `Duplicate check: Lead already exists with ID ${duplicate.id}`,
          });
          return setCorsHeaders(res);
        }
      }

      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Zapier';
      const lastName = nameParts.slice(1).join(' ') || 'Lead';

      // Resolve prerequisite IDs
      const [statusId, creatorId] = await Promise.all([
        resolveDefaultLeadStatusId(supabase, workspaceId),
        resolveCreatorId(supabase, {} as any, workspaceId),
      ]);

      const leadSourceId = await resolveOrCreateLeadSource(
        supabase,
        workspaceId,
        workspaceId, // Use workspaceId as the connector reference for Zapier
        'Zapier Integration',
        creatorId
      );

      const { data: newLead, error } = await supabase
        .from('crm_leads')
        .insert({
          workspace_id: workspaceId,
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone_number: phone || null,
          company_name: company || null,
          notes: notes || null,
          status_id: statusId,
          created_by: creatorId,
          source_id: leadSourceId,
        })
        .select('id')
        .single();

      if (error) throw error;

      await createZapierLog(supabase, {
        workspace_id: workspaceId,
        request_type: actionType,
        status: 'Success',
        message: `Lead created successfully with ID: ${newLead.id}`,
      });

      return setCorsHeaders(NextResponse.json({ success: true, data: newLead }));
    }

    if (action === 'update_lead') {
      const leadId = payload.id || payload.lead_id;
      if (!leadId) throw new Error('Lead ID is required for updates.');

      const updateData: Record<string, any> = {};
      if (payload.status_id) updateData.status_id = payload.status_id;
      if (payload.owner_id) updateData.owner_id = payload.owner_id;
      if (payload.company_name) updateData.company_name = payload.company_name;

      const { data: updatedLead, error } = await supabase
        .from('crm_leads')
        .update(updateData)
        .eq('id', leadId)
        .eq('workspace_id', workspaceId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!updatedLead) throw new Error('Lead not found in this workspace.');

      await createZapierLog(supabase, {
        workspace_id: workspaceId,
        request_type: actionType,
        status: 'Success',
        message: `Lead ${leadId} updated successfully.`,
      });

      return setCorsHeaders(NextResponse.json({ success: true, data: updatedLead }));
    }

    // --- Contact Actions ---
    if (action === 'create_contact') {
      const name = payload.name || '';
      const email = payload.email || '';
      const phone = payload.phone || payload.phone_number || '';
      const company = payload.company || payload.company_name || '';

      if (!name) throw new Error('Contact name is required.');

      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Zapier';
      const lastName = nameParts.slice(1).join(' ') || 'Contact';

      const { data: newContact, error } = await supabase
        .from('crm_contacts')
        .insert({
          workspace_id: workspaceId,
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone_number: phone || null,
          company_name: company || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      await createZapierLog(supabase, {
        workspace_id: workspaceId,
        request_type: actionType,
        status: 'Success',
        message: `Contact created successfully with ID: ${newContact.id}`,
      });

      return setCorsHeaders(NextResponse.json({ success: true, data: newContact }));
    }

    // --- Account Actions ---
    if (action === 'create_account') {
      const accountName = payload.name || payload.account_name || '';
      const industry = payload.industry || '';
      const website = payload.website || '';
      const phone = payload.phone || '';

      if (!accountName) throw new Error('Account name is required.');

      const { data: newAccount, error } = await supabase
        .from('crm_accounts')
        .insert({
          workspace_id: workspaceId,
          name: accountName,
          industry: industry || null,
          website: website || null,
          phone_number: phone || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      await createZapierLog(supabase, {
        workspace_id: workspaceId,
        request_type: actionType,
        status: 'Success',
        message: `Account created successfully with ID: ${newAccount.id}`,
      });

      return setCorsHeaders(NextResponse.json({ success: true, data: newAccount }));
    }

    // --- Opportunity Actions ---
    if (action === 'create_opportunity') {
      const oppName = payload.name || payload.opportunity_name || '';
      const value = parseFloat(payload.value || payload.amount || '0');
      const stageId = payload.stage || payload.stage_id || null;

      if (!oppName) throw new Error('Opportunity name is required.');

      const { data: newOpp, error } = await supabase
        .from('crm_opportunities')
        .insert({
          workspace_id: workspaceId,
          name: oppName,
          value: value,
          stage_id: stageId,
        })
        .select('id')
        .single();

      if (error) throw error;

      await createZapierLog(supabase, {
        workspace_id: workspaceId,
        request_type: actionType,
        status: 'Success',
        message: `Opportunity created successfully with ID: ${newOpp.id}`,
      });

      return setCorsHeaders(NextResponse.json({ success: true, data: newOpp }));
    }

    // --- Search Actions ---
    if (action === 'search_lead') {
      const email = payload.email || '';
      const phone = payload.phone || payload.phone_number || '';
      const leadId = payload.id || payload.lead_id || '';

      let query = supabase.from('crm_leads').select('id, first_name, last_name, email, phone_number, company_name').eq('workspace_id', workspaceId);

      if (leadId) {
        query = query.eq('id', leadId);
      } else if (email) {
        query = query.eq('email', email);
      } else if (phone) {
        query = query.eq('phone_number', phone);
      } else {
        throw new Error('Must search by either Lead ID, Email, or Phone.');
      }

      const { data: results, error } = await query;
      if (error) throw error;

      await createZapierLog(supabase, {
        workspace_id: workspaceId,
        request_type: actionType,
        status: 'Success',
        message: `Lead search completed. Found ${results?.length || 0} match(es).`,
      });

      return setCorsHeaders(NextResponse.json({ success: true, data: results || [] }));
    }

    if (action === 'search_contact') {
      const email = payload.email || '';
      const phone = payload.phone || payload.phone_number || '';
      const contactId = payload.id || payload.contact_id || '';

      let query = supabase.from('crm_contacts').select('id, first_name, last_name, email, phone_number').eq('workspace_id', workspaceId);

      if (contactId) {
        query = query.eq('id', contactId);
      } else if (email) {
        query = query.eq('email', email);
      } else if (phone) {
        query = query.eq('phone_number', phone);
      } else {
        throw new Error('Must search by either Contact ID, Email, or Phone.');
      }

      const { data: results, error } = await query;
      if (error) throw error;

      await createZapierLog(supabase, {
        workspace_id: workspaceId,
        request_type: actionType,
        status: 'Success',
        message: `Contact search completed. Found ${results?.length || 0} match(es).`,
      });

      return setCorsHeaders(NextResponse.json({ success: true, data: results || [] }));
    }

    if (action === 'search_account') {
      const name = payload.name || payload.account_name || '';
      const accountId = payload.id || payload.account_id || '';

      let query = supabase.from('crm_accounts').select('id, name, industry, website').eq('workspace_id', workspaceId);

      if (accountId) {
        query = query.eq('id', accountId);
      } else if (name) {
        query = query.ilike('name', `%${name}%`);
      } else {
        throw new Error('Must search by either Account ID or Account Name.');
      }

      const { data: results, error } = await query;
      if (error) throw error;

      await createZapierLog(supabase, {
        workspace_id: workspaceId,
        request_type: actionType,
        status: 'Success',
        message: `Account search completed. Found ${results?.length || 0} match(es).`,
      });

      return setCorsHeaders(NextResponse.json({ success: true, data: results || [] }));
    }

    throw new Error(`Unsupported Zapier action: ${action}`);
  } catch (err: any) {
    console.error(`[Zapier Action Submit] Error on ${actionType}:`, err);
    if (workspaceId) {
      await createZapierLog(supabase, {
        workspace_id: workspaceId,
        request_type: actionType,
        status: 'Failed',
        message: err.message || 'Internal Server Error',
      });
    }
    const res = NextResponse.json(
      { success: false, message: err.message || 'Internal Server Error', statusCode: 500 },
      { status: 500 }
    );
    return setCorsHeaders(res);
  }
}

// Settings endpoints called by CRM client users
export async function handleGetZapierSettings(workspaceId: string, supabase: any) {
  try {
    let { data: integration } = await supabase
      .schema('core')
      .from('zapier_integrations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!integration) {
      const { data: newIntegration } = await supabase
        .schema('core')
        .from('zapier_integrations')
        .insert({ workspace_id: workspaceId, status: 'active' })
        .select()
        .single();
      integration = newIntegration;
    }

    const { data: apiKeys } = await supabase
      .schema('core')
      .from('zapier_api_keys')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');

    const { data: logs } = await supabase
      .schema('core')
      .from('zapier_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(30);

    return NextResponse.json({
      success: true,
      data: {
        integration,
        apiKeys: apiKeys || [],
        logs: logs || [],
      },
    });
  } catch (err: any) {
    console.error('Failed to get Zapier settings:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function handleToggleZapierStatus(workspaceId: string, checked: boolean, supabase: any) {
  try {
    const nextStatus = checked ? 'active' : 'disabled';
    const { data, error } = await supabase
      .schema('core')
      .from('zapier_integrations')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Failed to toggle Zapier status:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function handleGenerateZapierKey(workspaceId: string, supabase: any) {
  try {
    const { generateRandomKey, maskApiKey } = await import('./zapier-provider');
    const newKey = generateRandomKey();
    const masked = maskApiKey(newKey);

    // Invalidate existing key
    await supabase
      .schema('core')
      .from('zapier_api_keys')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId);

    const { data: createdKey, error } = await supabase
      .schema('core')
      .from('zapier_api_keys')
      .insert({
        workspace_id: workspaceId,
        api_key: newKey,
        masked_key: masked,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: { key: newKey, record: createdKey } });
  } catch (err: any) {
    console.error('Failed to generate Zapier key:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function handleRevokeZapierKey(workspaceId: string, supabase: any) {
  try {
    const { error } = await supabase
      .schema('core')
      .from('zapier_api_keys')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to revoke Zapier key:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
