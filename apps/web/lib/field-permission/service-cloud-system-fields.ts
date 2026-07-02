/**
 * Canonical system field definitions for service cloud entities.
 */

export interface ServiceCloudSystemFieldDef {
  field_key: string;
  field_label: string;
  field_type: string;
  db_columns: string[];
  display_order: number;
  relation_keys?: string[];
}

export const TICKET_SYSTEM_FIELD_DEFINITIONS: ServiceCloudSystemFieldDef[] = [
  { field_key: 'ticket_number', field_label: 'Ticket #', field_type: 'number', db_columns: ['ticket_number'], display_order: 10 },
  { field_key: 'subject', field_label: 'Subject', field_type: 'text', db_columns: ['subject'], display_order: 20 },
  { field_key: 'description', field_label: 'Description', field_type: 'textarea', db_columns: ['description'], display_order: 30 },
  { field_key: 'source', field_label: 'Source', field_type: 'single_select', db_columns: ['source'], display_order: 40 },
  { field_key: 'status', field_label: 'Status', field_type: 'status', db_columns: ['status_id'], relation_keys: ['status'], display_order: 50 },
  { field_key: 'priority', field_label: 'Priority', field_type: 'single_select', db_columns: ['priority_id'], relation_keys: ['priority'], display_order: 60 },
  { field_key: 'category', field_label: 'Category', field_type: 'single_select', db_columns: ['category_id'], relation_keys: ['category'], display_order: 70 },
  { field_key: 'customer', field_label: 'Customer', field_type: 'single_select', db_columns: ['customer_id'], relation_keys: ['customer'], display_order: 80 },
  { field_key: 'organization', field_label: 'Organization', field_type: 'single_select', db_columns: ['organization_id'], relation_keys: ['organization'], display_order: 90 },
  { field_key: 'assigned_agent', field_label: 'Assigned Agent', field_type: 'user', db_columns: ['assigned_agent_id'], relation_keys: ['assigned_agent'], display_order: 100 },
  { field_key: 'assigned_team', field_label: 'Assigned Team', field_type: 'single_select', db_columns: ['assigned_team_id'], relation_keys: ['assigned_team'], display_order: 110 },
  { field_key: 'due_at', field_label: 'Due Date', field_type: 'datetime', db_columns: ['due_at'], display_order: 120 },
  { field_key: 'tags', field_label: 'Tags', field_type: 'tag', db_columns: ['tags'], display_order: 130 },
  { field_key: 'created_at', field_label: 'Created On', field_type: 'datetime', db_columns: ['created_at'], display_order: 140 },
];

export const TICKET_DB_COLUMN_TO_FIELD_KEY: Record<string, string> = {
  ticket_number: 'ticket_number',
  subject: 'subject',
  description: 'description',
  source: 'source',
  status_id: 'status',
  priority_id: 'priority',
  category_id: 'category',
  customer_id: 'customer',
  organization_id: 'organization',
  assigned_agent_id: 'assigned_agent',
  assigned_team_id: 'assigned_team',
  due_at: 'due_at',
  tags: 'tags',
  created_at: 'created_at',
};

export const CUSTOMER_SYSTEM_FIELD_DEFINITIONS: ServiceCloudSystemFieldDef[] = [
  { field_key: 'name', field_label: 'Name', field_type: 'text', db_columns: ['name'], display_order: 10 },
  { field_key: 'email', field_label: 'Email', field_type: 'email', db_columns: ['email'], display_order: 20 },
  { field_key: 'phone', field_label: 'Phone', field_type: 'phone', db_columns: ['phone'], display_order: 30 },
  { field_key: 'job_title', field_label: 'Job Title', field_type: 'text', db_columns: ['job_title'], display_order: 40 },
  { field_key: 'organization', field_label: 'Organization', field_type: 'single_select', db_columns: ['organization_id'], relation_keys: ['organization'], display_order: 50 },
  { field_key: 'timezone', field_label: 'Timezone', field_type: 'text', db_columns: ['timezone'], display_order: 60 },
  { field_key: 'locale', field_label: 'Locale', field_type: 'text', db_columns: ['locale'], display_order: 70 },
  { field_key: 'tags', field_label: 'Tags', field_type: 'tag', db_columns: ['tags'], display_order: 80 },
];

export const CUSTOMER_DB_COLUMN_TO_FIELD_KEY: Record<string, string> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  job_title: 'job_title',
  organization_id: 'organization',
  timezone: 'timezone',
  locale: 'locale',
  tags: 'tags',
};

export const ORGANIZATION_SYSTEM_FIELD_DEFINITIONS: ServiceCloudSystemFieldDef[] = [
  { field_key: 'name', field_label: 'Name', field_type: 'text', db_columns: ['name'], display_order: 10 },
  { field_key: 'email', field_label: 'Email', field_type: 'email', db_columns: ['email'], display_order: 20 },
  { field_key: 'phone', field_label: 'Phone', field_type: 'phone', db_columns: ['phone'], display_order: 30 },
  { field_key: 'website', field_label: 'Website', field_type: 'url', db_columns: ['website'], display_order: 40 },
  { field_key: 'industry', field_label: 'Industry', field_type: 'text', db_columns: ['industry'], display_order: 50 },
  { field_key: 'address_line_1', field_label: 'Address Line 1', field_type: 'text', db_columns: ['address_line_1'], display_order: 60 },
  { field_key: 'city', field_label: 'City', field_type: 'text', db_columns: ['city'], display_order: 70 },
  { field_key: 'state', field_label: 'State', field_type: 'text', db_columns: ['state'], display_order: 80 },
  { field_key: 'country', field_label: 'Country', field_type: 'text', db_columns: ['country'], display_order: 90 },
  { field_key: 'owner_id', field_label: 'Owner', field_type: 'user', db_columns: ['owner_id'], relation_keys: ['owner'], display_order: 100 },
  { field_key: 'tags', field_label: 'Tags', field_type: 'tag', db_columns: ['tags'], display_order: 110 },
];

export const ORGANIZATION_DB_COLUMN_TO_FIELD_KEY: Record<string, string> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  website: 'website',
  industry: 'industry',
  address_line_1: 'address_line_1',
  city: 'city',
  state: 'state',
  country: 'country',
  owner_id: 'owner_id',
  tags: 'tags',
};
