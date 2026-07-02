/**
 * Canonical system field definitions for accounts.
 * field_key is the FLS identifier; db_columns are crm_accounts columns affected.
 */

export interface AccountSystemFieldDef {
  field_key: string;
  field_label: string;
  field_type: string;
  db_columns: string[];
  display_order: number;
  relation_keys?: string[];
}

export const ACCOUNT_SYSTEM_FIELD_DEFINITIONS: AccountSystemFieldDef[] = [
  { field_key: 'account_name', field_label: 'Account Name', field_type: 'text', db_columns: ['account_name'], display_order: 10 },
  { field_key: 'website', field_label: 'Website', field_type: 'url', db_columns: ['website'], display_order: 20 },
  { field_key: 'phone', field_label: 'Phone', field_type: 'phone', db_columns: ['phone_number'], display_order: 30 },
  { field_key: 'industry', field_label: 'Industry', field_type: 'single_select', db_columns: ['industry_id'], relation_keys: ['industry'], display_order: 40 },
  { field_key: 'company_size', field_label: 'Company Size', field_type: 'single_select', db_columns: ['company_size'], display_order: 50 },
  { field_key: 'annual_revenue', field_label: 'Annual Revenue', field_type: 'currency', db_columns: ['annual_revenue'], display_order: 60 },
  { field_key: 'employee_count', field_label: 'Employee Count', field_type: 'number', db_columns: ['employee_count'], display_order: 70 },
  { field_key: 'status', field_label: 'Status', field_type: 'status', db_columns: ['status_id'], relation_keys: ['status'], display_order: 80 },
  { field_key: 'account_type', field_label: 'Account Type', field_type: 'single_select', db_columns: ['account_type'], display_order: 90 },
  { field_key: 'billing_street', field_label: 'Billing Street', field_type: 'text', db_columns: ['billing_street'], display_order: 100 },
  { field_key: 'billing_city', field_label: 'Billing City', field_type: 'text', db_columns: ['billing_city'], display_order: 110 },
  { field_key: 'billing_state', field_label: 'Billing State', field_type: 'text', db_columns: ['billing_state'], display_order: 120 },
  { field_key: 'billing_postal_code', field_label: 'Billing Postal Code', field_type: 'text', db_columns: ['billing_postal_code'], display_order: 130 },
  { field_key: 'billing_country', field_label: 'Billing Country', field_type: 'text', db_columns: ['billing_country'], display_order: 140 },
  { field_key: 'shipping_street', field_label: 'Shipping Street', field_type: 'text', db_columns: ['shipping_street'], display_order: 150 },
  { field_key: 'shipping_city', field_label: 'Shipping City', field_type: 'text', db_columns: ['shipping_city'], display_order: 160 },
  { field_key: 'shipping_state', field_label: 'Shipping State', field_type: 'text', db_columns: ['shipping_state'], display_order: 170 },
  { field_key: 'shipping_postal_code', field_label: 'Shipping Postal Code', field_type: 'text', db_columns: ['shipping_postal_code'], display_order: 180 },
  { field_key: 'shipping_country', field_label: 'Shipping Country', field_type: 'text', db_columns: ['shipping_country'], display_order: 190 },
  { field_key: 'linkedin', field_label: 'LinkedIn', field_type: 'url', db_columns: ['linkedin_url'], display_order: 200 },
  { field_key: 'twitter', field_label: 'Twitter', field_type: 'text', db_columns: ['twitter_handle'], display_order: 210 },
  { field_key: 'owner_id', field_label: 'Owner', field_type: 'user', db_columns: ['owner_id'], relation_keys: ['owner'], display_order: 220 },
  { field_key: 'parent_account', field_label: 'Parent Account', field_type: 'single_select', db_columns: ['parent_account_id'], relation_keys: ['parent_account'], display_order: 230 },
  { field_key: 'customer_since', field_label: 'Customer Since', field_type: 'datetime', db_columns: ['customer_since'], display_order: 240 },
  { field_key: 'last_activity_date', field_label: 'Last Activity Date', field_type: 'datetime', db_columns: ['last_activity_date'], display_order: 250 },
  { field_key: 'total_revenue', field_label: 'Total Revenue', field_type: 'currency', db_columns: ['total_revenue'], display_order: 260 },
  { field_key: 'tags', field_label: 'Tags', field_type: 'tag', db_columns: ['tags'], display_order: 270 },
  { field_key: 'description', field_label: 'Description', field_type: 'textarea', db_columns: ['description'], display_order: 280 },
  { field_key: 'created_by', field_label: 'Created By', field_type: 'user', db_columns: ['created_by'], relation_keys: ['created_by_account'], display_order: 290 },
  { field_key: 'created_at', field_label: 'Created On', field_type: 'datetime', db_columns: ['created_at'], display_order: 300 },
  { field_key: 'updated_by', field_label: 'Last Updated By', field_type: 'user', db_columns: ['updated_by'], relation_keys: ['updated_by_account'], display_order: 310 },
];

/** UI column id → FLS field_key */
export const ACCOUNT_COLUMN_TO_FIELD_KEY: Record<string, string> = {
  sno: 'sno',
  name: 'account_name',
  account_name: 'account_name',
  website: 'website',
  phone: 'phone',
  phone_number: 'phone',
  industry: 'industry',
  company_size: 'company_size',
  annual_revenue: 'annual_revenue',
  employee_count: 'employee_count',
  status: 'status',
  account_type: 'account_type',
  billing_street: 'billing_street',
  billing_city: 'billing_city',
  billing_state: 'billing_state',
  billing_postal_code: 'billing_postal_code',
  billing_country: 'billing_country',
  shipping_street: 'shipping_street',
  shipping_city: 'shipping_city',
  shipping_state: 'shipping_state',
  shipping_postal_code: 'shipping_postal_code',
  shipping_country: 'shipping_country',
  linkedin: 'linkedin',
  linkedin_url: 'linkedin',
  twitter: 'twitter',
  twitter_handle: 'twitter',
  owner_id: 'owner_id',
  parent_account: 'parent_account',
  customer_since: 'customer_since',
  last_activity_date: 'last_activity_date',
  total_revenue: 'total_revenue',
  tags: 'tags',
  description: 'description',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
};

/** DB column / API payload body key → FLS field_key */
export const ACCOUNT_DB_COLUMN_TO_FIELD_KEY: Record<string, string> = {
  account_name: 'account_name',
  website: 'website',
  phone_number: 'phone',
  industry_id: 'industry',
  company_size: 'company_size',
  annual_revenue: 'annual_revenue',
  employee_count: 'employee_count',
  status_id: 'status',
  account_type: 'account_type',
  billing_street: 'billing_street',
  billing_city: 'billing_city',
  billing_state: 'billing_state',
  billing_postal_code: 'billing_postal_code',
  billing_country: 'billing_country',
  shipping_street: 'shipping_street',
  shipping_city: 'shipping_city',
  shipping_state: 'shipping_state',
  shipping_postal_code: 'shipping_postal_code',
  shipping_country: 'shipping_country',
  linkedin_url: 'linkedin',
  twitter_handle: 'twitter',
  owner_id: 'owner_id',
  parent_account_id: 'parent_account',
  customer_since: 'customer_since',
  last_activity_date: 'last_activity_date',
  total_revenue: 'total_revenue',
  tags: 'tags',
  description: 'description',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
};
