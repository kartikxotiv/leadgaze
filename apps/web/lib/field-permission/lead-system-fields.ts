/**
 * Canonical system field definitions for leads.
 * field_key is the FLS identifier; db_columns are crm_leads columns affected.
 */

export interface LeadSystemFieldDef {
  field_key: string;
  field_label: string;
  field_type: string;
  db_columns: string[];
  display_order: number;
  /** Joined relation keys to strip when field is hidden */
  relation_keys?: string[];
}

export const LEAD_SYSTEM_FIELD_DEFINITIONS: LeadSystemFieldDef[] = [
  { field_key: 'first_name', field_label: 'First Name', field_type: 'text', db_columns: ['first_name'], display_order: 10 },
  { field_key: 'last_name', field_label: 'Last Name', field_type: 'text', db_columns: ['last_name'], display_order: 20 },
  { field_key: 'email', field_label: 'Email', field_type: 'email', db_columns: ['email'], display_order: 30 },
  { field_key: 'alt_email', field_label: 'Alt Email', field_type: 'email', db_columns: ['alt_email'], display_order: 40 },
  { field_key: 'phone', field_label: 'Phone', field_type: 'phone', db_columns: ['phone_number'], display_order: 50 },
  { field_key: 'mobile', field_label: 'Mobile', field_type: 'phone', db_columns: ['mobile_number'], display_order: 60 },
  { field_key: 'company', field_label: 'Company', field_type: 'text', db_columns: ['company_name'], display_order: 70 },
  { field_key: 'company_website', field_label: 'Company Website', field_type: 'url', db_columns: ['company_website'], display_order: 80 },
  { field_key: 'company_linkedin', field_label: 'Company LinkedIn', field_type: 'url', db_columns: ['company_linkedin_url'], display_order: 90 },
  { field_key: 'linkedin', field_label: 'LinkedIn', field_type: 'url', db_columns: ['linkedin_url'], display_order: 100 },
  { field_key: 'job_title', field_label: 'Job Title', field_type: 'text', db_columns: ['job_title'], display_order: 110 },
  { field_key: 'department', field_label: 'Department', field_type: 'text', db_columns: ['department'], display_order: 120 },
  { field_key: 'industry', field_label: 'Industry', field_type: 'single_select', db_columns: ['industry_id'], relation_keys: ['industry'], display_order: 130 },
  { field_key: 'company_size', field_label: 'Company Size', field_type: 'single_select', db_columns: ['company_size'], display_order: 140 },
  { field_key: 'location', field_label: 'Location', field_type: 'text', db_columns: ['location'], display_order: 150 },
  { field_key: 'timezone', field_label: 'Timezone', field_type: 'text', db_columns: ['timezone'], display_order: 160 },
  { field_key: 'status', field_label: 'Status', field_type: 'status', db_columns: ['status_id'], relation_keys: ['status'], display_order: 170 },
  { field_key: 'source', field_label: 'Source', field_type: 'single_select', db_columns: ['source_id'], relation_keys: ['source'], display_order: 180 },
  { field_key: 'trigger', field_label: 'Trigger', field_type: 'text', db_columns: ['trigger'], display_order: 190 },
  { field_key: 'notes', field_label: 'Notes', field_type: 'textarea', db_columns: ['notes'], display_order: 200 },
  { field_key: 'score', field_label: 'Score', field_type: 'number', db_columns: ['lead_score'], display_order: 210 },
  { field_key: 'annual_revenue', field_label: 'Annual Revenue', field_type: 'currency', db_columns: ['annual_revenue'], display_order: 220 },
  { field_key: 'owner_id', field_label: 'Owner', field_type: 'user', db_columns: ['owner_id'], relation_keys: ['owner'], display_order: 230 },
  { field_key: 'tags', field_label: 'Tags', field_type: 'tag', db_columns: ['tags'], display_order: 240 },
  { field_key: 'created_by', field_label: 'Created By', field_type: 'user', db_columns: ['created_by'], relation_keys: ['created_by_account'], display_order: 250 },
  { field_key: 'created_at', field_label: 'Created On', field_type: 'datetime', db_columns: ['created_at'], display_order: 260 },
  { field_key: 'updated_by', field_label: 'Last Updated By', field_type: 'user', db_columns: ['updated_by'], relation_keys: ['updated_by_account'], display_order: 270 },
];

/** UI column id → FLS field_key */
export const LEAD_COLUMN_TO_FIELD_KEY: Record<string, string> = {
  sno: 'sno',
  name: 'first_name',
  first_name: 'first_name',
  last_name: 'last_name',
  job_title: 'job_title',
  email: 'email',
  alt_email: 'alt_email',
  phone: 'phone',
  mobile: 'mobile',
  company: 'company',
  company_website: 'company_website',
  company_linkedin: 'company_linkedin',
  linkedin: 'linkedin',
  department: 'department',
  industry: 'industry',
  company_size: 'company_size',
  location: 'location',
  timezone: 'timezone',
  status: 'status',
  source: 'source',
  trigger: 'trigger',
  notes: 'notes',
  score: 'score',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
};

/** crm_leads column / body key → FLS field_key */
export const LEAD_DB_COLUMN_TO_FIELD_KEY: Record<string, string> = {
  first_name: 'first_name',
  last_name: 'last_name',
  email: 'email',
  alt_email: 'alt_email',
  phone_number: 'phone',
  mobile_number: 'mobile',
  company_name: 'company',
  company_website: 'company_website',
  company_linkedin_url: 'company_linkedin',
  linkedin_url: 'linkedin',
  job_title: 'job_title',
  department: 'department',
  industry_id: 'industry',
  company_size: 'company_size',
  annual_revenue: 'annual_revenue',
  location: 'location',
  timezone: 'timezone',
  status_id: 'status',
  source_id: 'source',
  trigger: 'trigger',
  notes: 'notes',
  lead_score: 'score',
  owner_id: 'owner_id',
  tags: 'tags',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
};

export function getSystemFieldByKey(fieldKey: string): LeadSystemFieldDef | undefined {
  return LEAD_SYSTEM_FIELD_DEFINITIONS.find((f) => f.field_key === fieldKey);
}
