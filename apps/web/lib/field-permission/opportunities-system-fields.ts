/**
 * Canonical system field definitions for opportunities.
 * field_key is the FLS identifier; db_columns are crm_opportunities columns affected.
 */

export interface OpportunitySystemFieldDef {
  field_key: string;
  field_label: string;
  field_type: string;
  db_columns: string[];
  display_order: number;
  relation_keys?: string[];
}

export const OPPORTUNITY_SYSTEM_FIELD_DEFINITIONS: OpportunitySystemFieldDef[] = [
  { field_key: 'opportunity_name', field_label: 'Opportunity Name', field_type: 'text', db_columns: ['opportunity_name'], display_order: 10 },
  { field_key: 'description', field_label: 'Description', field_type: 'textarea', db_columns: ['description'], display_order: 20 },
  { field_key: 'stage', field_label: 'Stage', field_type: 'status', db_columns: ['stage_id'], relation_keys: ['stage'], display_order: 30 },
  { field_key: 'account', field_label: 'Account', field_type: 'single_select', db_columns: ['account_id'], relation_keys: ['account'], display_order: 40 },
  { field_key: 'primary_contact', field_label: 'Primary Contact', field_type: 'single_select', db_columns: ['primary_contact_id'], relation_keys: ['primary_contact'], display_order: 50 },
  { field_key: 'amount', field_label: 'Amount', field_type: 'currency', db_columns: ['amount'], display_order: 60 },
  { field_key: 'currency', field_label: 'Currency', field_type: 'single_select', db_columns: ['currency'], display_order: 70 },
  { field_key: 'probability', field_label: 'Probability (%)', field_type: 'number', db_columns: ['probability'], display_order: 80 },
  { field_key: 'expected_revenue', field_label: 'Expected Revenue', field_type: 'currency', db_columns: ['expected_revenue'], display_order: 90 },
  { field_key: 'expected_close_date', field_label: 'Expected Close Date', field_type: 'date', db_columns: ['expected_close_date'], display_order: 100 },
  { field_key: 'actual_close_date', field_label: 'Actual Close Date', field_type: 'date', db_columns: ['actual_close_date'], display_order: 110 },
  { field_key: 'priority', field_label: 'Priority', field_type: 'single_select', db_columns: ['priority'], display_order: 120 },
  { field_key: 'opportunity_type', field_label: 'Type', field_type: 'single_select', db_columns: ['opportunity_type'], display_order: 130 },
  { field_key: 'lead_source', field_label: 'Lead Source', field_type: 'text', db_columns: ['lead_source'], display_order: 140 },
  { field_key: 'campaign', field_label: 'Campaign', field_type: 'single_select', db_columns: ['campaign_id'], relation_keys: ['campaign'], display_order: 150 },
  { field_key: 'owner_id', field_label: 'Owner', field_type: 'user', db_columns: ['owner_id'], relation_keys: ['owner'], display_order: 160 },
  { field_key: 'is_closed', field_label: 'Is Closed', field_type: 'boolean', db_columns: ['is_closed'], display_order: 170 },
  { field_key: 'is_won', field_label: 'Is Won', field_type: 'boolean', db_columns: ['is_won'], display_order: 180 },
  { field_key: 'close_reason', field_label: 'Close Reason', field_type: 'textarea', db_columns: ['close_reason'], display_order: 190 },
  { field_key: 'competitor', field_label: 'Competitor', field_type: 'text', db_columns: ['competitor'], display_order: 200 },
  { field_key: 'tags', field_label: 'Tags', field_type: 'tag', db_columns: ['tags'], display_order: 210 },
  { field_key: 'created_by', field_label: 'Created By', field_type: 'user', db_columns: ['created_by'], relation_keys: ['created_by_account'], display_order: 220 },
  { field_key: 'created_at', field_label: 'Created On', field_type: 'datetime', db_columns: ['created_at'], display_order: 230 },
  { field_key: 'updated_by', field_label: 'Last Updated By', field_type: 'user', db_columns: ['updated_by'], relation_keys: ['updated_by_account'], display_order: 240 },
];

/** UI column id → FLS field_key */
export const OPPORTUNITY_COLUMN_TO_FIELD_KEY: Record<string, string> = {
  sno: 'sno',
  name: 'opportunity_name',
  opportunity_name: 'opportunity_name',
  description: 'description',
  stage: 'stage',
  account: 'account',
  primary_contact: 'primary_contact',
  amount: 'amount',
  currency: 'currency',
  probability: 'probability',
  expected_revenue: 'expected_revenue',
  expected_close_date: 'expected_close_date',
  actual_close_date: 'actual_close_date',
  priority: 'priority',
  opportunity_type: 'opportunity_type',
  lead_source: 'lead_source',
  campaign: 'campaign',
  owner_id: 'owner_id',
  is_closed: 'is_closed',
  is_won: 'is_won',
  close_reason: 'close_reason',
  competitor: 'competitor',
  tags: 'tags',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
};

/** DB column / API payload body key → FLS field_key */
export const OPPORTUNITY_DB_COLUMN_TO_FIELD_KEY: Record<string, string> = {
  opportunity_name: 'opportunity_name',
  description: 'description',
  stage_id: 'stage',
  account_id: 'account',
  primary_contact_id: 'primary_contact',
  amount: 'amount',
  currency: 'currency',
  probability: 'probability',
  expected_revenue: 'expected_revenue',
  expected_close_date: 'expected_close_date',
  actual_close_date: 'actual_close_date',
  priority: 'priority',
  opportunity_type: 'opportunity_type',
  lead_source: 'lead_source',
  campaign_id: 'campaign',
  owner_id: 'owner_id',
  is_closed: 'is_closed',
  is_won: 'is_won',
  close_reason: 'close_reason',
  competitor: 'competitor',
  tags: 'tags',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
};
