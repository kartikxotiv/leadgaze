/**
 * @kit/integration-website
 *
 * Domain types for the Website Connector integration.
 * These replace the ad-hoc types previously defined in apps/web/services/connectors.service.ts
 */

// =============================================================================
// CONNECTOR TYPES
// =============================================================================

/** Status of a connector */
export type ConnectorStatus = 'active' | 'inactive';

/** Target module a connector routes leads/tickets into */
export type ConnectorDestinationModule = 'crm' | 'service_cloud';

/** Assignment mode for routing incoming submissions */
export type ConnectorAssignmentMode = 'fixed' | 'round_robin' | 'load_balanced';

/**
 * A website connector record as returned from the database / API.
 */
export interface Connector {
  id: string;
  name: string;
  status: ConnectorStatus;
  type: string;
  destination_module: ConnectorDestinationModule;
  destination_entity: string;
  destination_config: {
    success_message?: string;
    redirect_url?: string;
    spam_protection?: boolean;
    lead_status?: string;
    ticket_priority?: string;
  };
  default_owner_id: string | null;
  assignment_mode: ConnectorAssignmentMode;
  assignment_rules: unknown[];
  created_at: string;
}

// =============================================================================
// FORM TYPES
// =============================================================================

/**
 * A form associated with a connector (used for embedded widgets).
 */
export interface ConnectorForm {
  id: string;
  connector_id: string;
  workspace_id: string;
  name: string;
  success_message: string;
  redirect_url: string;
  spam_protection_enabled: boolean;
  button_color?: string;
  heading?: string;
  subheading?: string;
}

/**
 * A single form field definition.
 */
export interface FormField {
  id: string;
  form_id?: string;
  field_name: string;
  label: string;
  field_type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox';
  is_required: boolean;
  sort_order: number;
}

// =============================================================================
// EVENT & LOG TYPES
// =============================================================================

/**
 * A raw inbound submission event recorded before processing.
 */
export interface ConnectorEvent {
  id: string;
  connector_id: string;
  workspace_id: string;
  source: 'api' | 'form' | 'sandbox';
  raw_payload: Record<string, unknown>;
  normalized_payload: NormalizedPayload;
  status: 'processing' | 'success' | 'duplicate' | 'error';
  created_at: string;
}

/**
 * Canonical representation of an inbound submission, regardless of raw field names.
 */
export interface NormalizedPayload {
  workspace_id: string;
  connector_id: string;
  source: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  company_website?: string;
  job_title?: string;
  message?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  custom_fields: Record<string, unknown>;
}

/**
 * A processing log entry linked to a connector event.
 */
export interface ConnectorLog {
  id: string;
  event_id: string;
  connector_id: string;
  workspace_id: string;
  status: 'success' | 'duplicate' | 'error';
  processing_result: {
    entity: string;
    entity_id: string | null;
    message: string;
    attribution: {
      source?: string;
      medium?: string;
      campaign?: string;
    };
  };
  error_message: string | null;
  created_at: string;
  event?: {
    source: string;
    raw_payload: Record<string, unknown>;
    normalized_payload: NormalizedPayload;
  };
}

// =============================================================================
// PROVIDER INPUT TYPES
// =============================================================================

/**
 * Raw input from the submit or sandbox endpoint — before normalization.
 */
export interface WebsiteSubmitInput {
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  mobile_number?: string;
  company?: string;
  company_name?: string;
  company_website?: string;
  job_title?: string;
  message?: string;
  notes?: string;
  description?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  /** Optional score supplied by an approved external scoring source. */
  score?: number;
  /** Identifies which system calculated `score`. */
  score_source?: string;
  custom_fields?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Input for ingesting a CRM lead from a website submission.
 */
export interface IngestLeadInput {
  workspace_id: string;
  connector_id: string;
  connector_name: string;
  payload: WebsiteSubmitInput;
  default_owner_id: string | null;
}

/**
 * Input for ingesting a service-cloud ticket from a website submission.
 */
export interface IngestTicketInput {
  workspace_id: string;
  payload: WebsiteSubmitInput;
  default_owner_id: string | null;
}

/**
 * Result from an ingestion operation.
 */
export interface IngestionResult {
  status: 'success' | 'duplicate';
  entity_id: string | null;
  message: string;
}
