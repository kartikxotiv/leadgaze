/**
 * @kit/integration-website
 *
 * WebsiteConnectorProvider
 *
 * Pure server-side business logic for processing website connector submissions.
 * Has NO dependency on Next.js — receives a Supabase admin client instance and
 * operates on the database directly.  Route handlers remain thin wrappers that
 * authenticate, call these functions, and format HTTP responses.
 */

import type {
  Connector,
  ConnectorEvent,
  ConnectorLog,
  IngestLeadInput,
  IngestTicketInput,
  IngestionResult,
  NormalizedPayload,
  WebsiteSubmitInput,
} from './types';

// ---------------------------------------------------------------------------
// Payload Normalization
// ---------------------------------------------------------------------------

/**
 * Converts a raw, arbitrarily-shaped website submission into the canonical
 * NormalizedPayload shape used throughout the system.
 */
export function normalizePayload(
  raw: WebsiteSubmitInput,
  workspaceId: string,
  connectorId: string,
  source: string = 'api',
): NormalizedPayload {
  return {
    workspace_id: workspaceId,
    connector_id: connectorId,
    source,
    name: raw.name || raw.first_name || 'Anonymous',
    email: raw.email,
    phone: raw.phone || raw.phone_number || raw.mobile_number,
    company: raw.company || raw.company_name,
    message: raw.message || raw.description || raw.notes,
    utm_source: raw.utm_source,
    utm_medium: raw.utm_medium,
    utm_campaign: raw.utm_campaign,
    custom_fields: (raw.custom_fields as Record<string, unknown>) || {},
  };
}

// ---------------------------------------------------------------------------
// Event & Log Persistence
// ---------------------------------------------------------------------------

/**
 * Inserts a connector_events row with status='processing'.
 * Returns the created event so its ID can be used for later updates.
 */
export async function createConnectorEvent(
  supabase: any,
  params: {
    connector_id: string;
    workspace_id: string;
    source: string;
    raw_payload: WebsiteSubmitInput;
    normalized_payload: NormalizedPayload;
  },
): Promise<ConnectorEvent> {
  const { data, error } = await supabase
    .schema('core')
    .from('connector_events')
    .insert({
      connector_id: params.connector_id,
      workspace_id: params.workspace_id,
      source: params.source,
      raw_payload: params.raw_payload,
      normalized_payload: params.normalized_payload,
      status: 'processing',
    })
    .select()
    .single();

  if (error) throw error;
  return data as ConnectorEvent;
}

/**
 * Updates the status on a connector_events row after processing.
 */
export async function updateEventStatus(
  supabase: any,
  eventId: string,
  status: ConnectorEvent['status'],
): Promise<void> {
  const { error } = await supabase
    .schema('core')
    .from('connector_events')
    .update({ status })
    .eq('id', eventId);

  if (error) throw error;
}

/**
 * Inserts a connector_logs row recording the outcome of a submission.
 */
export async function createConnectorLog(
  supabase: any,
  params: {
    event_id: string;
    connector_id: string;
    workspace_id: string;
    status: ConnectorLog['status'];
    entity: string;
    entity_id: string | null;
    message: string;
    attribution: {
      source?: string;
      medium?: string;
      campaign?: string;
    };
  },
): Promise<void> {
  const { error } = await supabase
    .schema('core')
    .from('connector_logs')
    .insert({
      event_id: params.event_id,
      connector_id: params.connector_id,
      workspace_id: params.workspace_id,
      status: params.status,
      processing_result: {
        entity: params.entity,
        entity_id: params.entity_id,
        message: params.message,
        attribution: params.attribution,
      },
      error_message: null,
    });

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Duplicate Detection
// ---------------------------------------------------------------------------

/**
 * Returns true when a lead with the given email already exists in this workspace.
 */
export async function checkLeadDuplicate(
  supabase: any,
  workspaceId: string,
  email: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('crm_leads')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('email', email)
    .limit(1);

  return Array.isArray(data) && data.length > 0;
}

// ---------------------------------------------------------------------------
// Lead Status Resolution
// ---------------------------------------------------------------------------

/**
 * Looks up the default status_id for the 'leads' module in this workspace.
 */
export async function resolveDefaultLeadStatusId(
  supabase: any,
  workspaceId: string,
): Promise<string | null> {
  const { data: moduleData } = await supabase
    .from('crm_modules')
    .select('id')
    .eq('module_key', 'leads')
    .maybeSingle();

  if (!moduleData) return null;

  const { data: statusData } = await supabase
    .from('entity_statuses')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('module_id', moduleData.id)
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle();

  return statusData?.id ?? null;
}

// ---------------------------------------------------------------------------
// Creator Resolution
// ---------------------------------------------------------------------------

/**
 * Returns the user ID to set as `created_by` on a new lead.
 * Prefers the connector's default_owner_id; falls back to any workspace member.
 */
export async function resolveCreatorId(
  supabase: any,
  connector: Connector,
  workspaceId: string,
): Promise<string> {
  if (connector.default_owner_id) return connector.default_owner_id;

  const { data: member } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .limit(1)
    .maybeSingle();

  if (!member?.user_id) {
    throw new Error(
      'No valid member found in the workspace to set as lead creator.',
    );
  }

  return member.user_id as string;
}

// ---------------------------------------------------------------------------
// Lead Source Resolution
// ---------------------------------------------------------------------------

/**
 * Finds the lead_source row for this connector, or creates it if it doesn't
 * exist yet.  The source key is `connector_<connectorId>` so each connector
 * gets its own traceable source in the CRM.
 */
export async function resolveOrCreateLeadSource(
  supabase: any,
  workspaceId: string,
  connectorId: string,
  connectorName: string,
  creatorId: string,
): Promise<string | null> {
  const sourceKey = `connector_${connectorId}`;

  const { data: existing } = await supabase
    .from('lead_sources')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('source_key', sourceKey)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: newSource, error } = await supabase
    .from('lead_sources')
    .insert({
      workspace_id: workspaceId,
      source_name: `Connector: ${connectorName || 'Website'}`,
      source_key: sourceKey,
      color: '#4f46e5',
      icon: 'workflow',
      is_active: true,
      is_system: false,
      created_by: creatorId,
    })
    .select()
    .single();

  if (error) {
    console.error('[integration-website] Failed to create lead source:', error);
    return null;
  }

  return newSource.id as string;
}

// ---------------------------------------------------------------------------
// CRM Lead Ingestion
// ---------------------------------------------------------------------------

/**
 * Creates a new CRM lead from a website submission.
 * Handles status resolution, creator resolution, lead source resolution,
 * and the final insert — returning the new lead's ID.
 */
export async function ingestLeadToCrm(
  supabase: any,
  input: IngestLeadInput,
): Promise<IngestionResult> {
  const { workspace_id, connector_id, connector_name, payload, default_owner_id } = input;

  // Check for duplicate before doing any work
  if (payload.email) {
    const isDuplicate = await checkLeadDuplicate(supabase, workspace_id, payload.email);
    if (isDuplicate) {
      return {
        status: 'duplicate',
        entity_id: null,
        message: `Duplicate lead detected. An existing CRM lead profile already exists for ${payload.email}.`,
      };
    }
  }

  // Build name parts
  const fullName = (payload.name || '').trim();
  const nameParts = fullName.split(/\s+/);
  const firstName = payload.first_name || nameParts[0] || 'Website';
  const lastName = payload.last_name || nameParts.slice(1).join(' ') || 'Lead';
  const phoneVal = payload.phone || payload.phone_number || payload.mobile_number;
  const companyVal = payload.company || payload.company_name;
  const notesVal = payload.message || payload.notes || payload.description;

  // Resolve prerequisite IDs in parallel where possible
  const [statusId, creatorId] = await Promise.all([
    resolveDefaultLeadStatusId(supabase, workspace_id),
    resolveCreatorId(
      supabase,
      // Minimal connector shape for resolveCreatorId
      { default_owner_id } as Connector,
      workspace_id,
    ),
  ]);

  const leadSourceId = await resolveOrCreateLeadSource(
    supabase,
    workspace_id,
    connector_id,
    connector_name,
    creatorId,
  );

  const { data: newLead, error } = await supabase
    .from('crm_leads')
    .insert({
      workspace_id,
      first_name: firstName,
      last_name: lastName,
      email: payload.email || null,
      phone_number: phoneVal || null,
      company_name: companyVal || null,
      notes: notesVal || null,
      owner_id: default_owner_id || null,
      status_id: statusId,
      created_by: creatorId,
      source_id: leadSourceId,
    })
    .select()
    .single();

  if (error) {
    console.error('[integration-website] Lead insertion failed:', error);
    throw error;
  }

  return {
    status: 'success',
    entity_id: newLead.id as string,
    message: `Successfully generated new CRM Lead: ${firstName} ${lastName} (ID: ${newLead.id})`,
  };
}

// ---------------------------------------------------------------------------
// Service Cloud Ticket Ingestion
// ---------------------------------------------------------------------------

/**
 * Creates a new service-cloud ticket from a website submission.
 */
export async function ingestTicket(
  supabase: any,
  input: IngestTicketInput,
): Promise<IngestionResult> {
  const { workspace_id, payload, default_owner_id } = input;

  const { data: newTicket, error } = await supabase
    .schema('service_cloud')
    .from('tickets')
    .insert({
      workspace_id,
      subject: `New website inquiry: ${payload.name || 'Anonymous'}`,
      description: payload.message || 'No description provided.',
      priority: 'medium',
      status: 'new',
      source: 'api',
      assigned_to: default_owner_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[integration-website] Ticket insertion failed:', error);
    throw error;
  }

  return {
    status: 'success',
    entity_id: newTicket.id as string,
    message: `Successfully created support Ticket: #${newTicket.id}`,
  };
}

// ---------------------------------------------------------------------------
// Top-Level Process Function (main entry point for route handlers)
// ---------------------------------------------------------------------------

/**
 * Complete processing pipeline for a single website connector submission.
 *
 * 1. Normalizes the raw payload
 * 2. Creates a connector_events row
 * 3. Ingests the lead / ticket depending on the connector's destination_module
 * 4. Updates the event status
 * 5. Creates a connector_log
 *
 * Returns the final IngestionResult so the route handler can form the HTTP response.
 */
export async function processWebsiteSubmission(
  supabase: any,
  params: {
    connector: Connector;
    workspace_id: string;
    raw_payload: WebsiteSubmitInput;
    source?: string;
  },
): Promise<IngestionResult & { event_id: string }> {
  const { connector, workspace_id, raw_payload, source = 'api' } = params;

  // 1. Normalize
  const normalized = normalizePayload(raw_payload, workspace_id, connector.id, source);

  // 2. Create event
  const event = await createConnectorEvent(supabase, {
    connector_id: connector.id,
    workspace_id,
    source,
    raw_payload,
    normalized_payload: normalized,
  });

  let result: IngestionResult;

  try {
    // 3. Ingest
    if (connector.destination_module === 'crm') {
      result = await ingestLeadToCrm(supabase, {
        workspace_id,
        connector_id: connector.id,
        connector_name: connector.name,
        payload: raw_payload,
        default_owner_id: connector.default_owner_id,
      });
    } else {
      result = await ingestTicket(supabase, {
        workspace_id,
        payload: raw_payload,
        default_owner_id: connector.default_owner_id,
      });
    }
  } catch (err) {
    // On error — mark event as failed and rethrow
    await updateEventStatus(supabase, event.id, 'error').catch(() => {});
    throw err;
  }

  // 4. Update event status
  await updateEventStatus(supabase, event.id, result.status as ConnectorEvent['status']);

  // 5. Create log
  await createConnectorLog(supabase, {
    event_id: event.id,
    connector_id: connector.id,
    workspace_id,
    status: result.status,
    entity: connector.destination_entity,
    entity_id: result.entity_id,
    message: result.message,
    attribution: {
      source: raw_payload.utm_source,
      medium: raw_payload.utm_medium,
      campaign: raw_payload.utm_campaign,
    },
  });

  return { ...result, event_id: event.id };
}

export const name = 'integration-website';
