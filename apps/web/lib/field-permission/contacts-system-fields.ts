/**
 * Canonical system field definitions for contacts.
 * field_key is the FLS identifier; db_columns are crm_contacts columns affected.
 */

export interface ContactSystemFieldDef {
  field_key: string;
  field_label: string;
  field_type: string;
  db_columns: string[];
  display_order: number;
  relation_keys?: string[];
}

export const CONTACT_SYSTEM_FIELD_DEFINITIONS: ContactSystemFieldDef[] = [
  { field_key: 'first_name', field_label: 'First Name', field_type: 'text', db_columns: ['first_name'], display_order: 10 },
  { field_key: 'last_name', field_label: 'Last Name', field_type: 'text', db_columns: ['last_name'], display_order: 20 },
  { field_key: 'email', field_label: 'Email', field_type: 'email', db_columns: ['email'], display_order: 30 },
  { field_key: 'alt_email', field_label: 'Alt Email', field_type: 'email', db_columns: ['alt_email'], display_order: 40 },
  { field_key: 'phone', field_label: 'Phone', field_type: 'phone', db_columns: ['phone_number'], display_order: 50 },
  { field_key: 'mobile', field_label: 'Mobile', field_type: 'phone', db_columns: ['mobile_number'], display_order: 60 },
  { field_key: 'alt_phone', field_label: 'Alt Phone', field_type: 'phone', db_columns: ['alt_phone'], display_order: 70 },
  { field_key: 'job_title', field_label: 'Job Title', field_type: 'text', db_columns: ['job_title'], display_order: 80 },
  { field_key: 'department', field_label: 'Department', field_type: 'text', db_columns: ['department'], display_order: 90 },
  { field_key: 'linkedin', field_label: 'LinkedIn', field_type: 'url', db_columns: ['linkedin_url'], display_order: 100 },
  { field_key: 'twitter', field_label: 'Twitter', field_type: 'text', db_columns: ['twitter_handle'], display_order: 110 },
  { field_key: 'status', field_label: 'Status', field_type: 'status', db_columns: ['status_id'], relation_keys: ['status'], display_order: 120 },
  { field_key: 'account', field_label: 'Account', field_type: 'single_select', db_columns: ['account_id'], relation_keys: ['account'], display_order: 130 },
  { field_key: 'is_primary', field_label: 'Is Primary', field_type: 'boolean', db_columns: ['is_primary'], display_order: 140 },
  { field_key: 'reporting_to', field_label: 'Reports To', field_type: 'single_select', db_columns: ['reporting_to_id'], relation_keys: ['reporting_to'], display_order: 150 },
  { field_key: 'location', field_label: 'Location', field_type: 'text', db_columns: ['location'], display_order: 160 },
  { field_key: 'timezone', field_label: 'Timezone', field_type: 'text', db_columns: ['timezone'], display_order: 170 },
  { field_key: 'language', field_label: 'Language', field_type: 'text', db_columns: ['language'], display_order: 180 },
  { field_key: 'preferred_contact_method', field_label: 'Preferred Contact Method', field_type: 'single_select', db_columns: ['preferred_contact_method'], display_order: 190 },
  { field_key: 'do_not_call', field_label: 'Do Not Call', field_type: 'boolean', db_columns: ['do_not_call'], display_order: 200 },
  { field_key: 'do_not_email', field_label: 'Do Not Email', field_type: 'boolean', db_columns: ['do_not_email'], display_order: 210 },
  { field_key: 'email_bounced', field_label: 'Email Bounced', field_type: 'boolean', db_columns: ['email_bounced'], display_order: 220 },
  { field_key: 'owner_id', field_label: 'Owner', field_type: 'user', db_columns: ['owner_id'], relation_keys: ['owner'], display_order: 230 },
  { field_key: 'tags', field_label: 'Tags', field_type: 'tag', db_columns: ['tags'], display_order: 240 },
  { field_key: 'notes', field_label: 'Notes', field_type: 'textarea', db_columns: ['notes'], display_order: 250 },
  { field_key: 'created_by', field_label: 'Created By', field_type: 'user', db_columns: ['created_by'], relation_keys: ['created_by_account'], display_order: 260 },
  { field_key: 'created_at', field_label: 'Created On', field_type: 'datetime', db_columns: ['created_at'], display_order: 270 },
  { field_key: 'updated_by', field_label: 'Last Updated By', field_type: 'user', db_columns: ['updated_by'], relation_keys: ['updated_by_account'], display_order: 280 },
  { field_key: 'last_contact_date', field_label: 'Last Contact Date', field_type: 'datetime', db_columns: ['last_contact_date'], display_order: 290 },
];

/** UI column id → FLS field_key */
export const CONTACT_COLUMN_TO_FIELD_KEY: Record<string, string> = {
  sno: 'sno',
  name: 'first_name',
  first_name: 'first_name',
  last_name: 'last_name',
  email: 'email',
  alt_email: 'alt_email',
  phone: 'phone',
  phone_number: 'phone',
  mobile: 'mobile',
  mobile_number: 'mobile',
  alt_phone: 'alt_phone',
  job_title: 'job_title',
  department: 'department',
  linkedin: 'linkedin',
  linkedin_url: 'linkedin',
  twitter: 'twitter',
  twitter_handle: 'twitter',
  status: 'status',
  account: 'account',
  is_primary: 'is_primary',
  reporting_to: 'reporting_to',
  location: 'location',
  timezone: 'timezone',
  language: 'language',
  preferred_contact_method: 'preferred_contact_method',
  do_not_call: 'do_not_call',
  do_not_email: 'do_not_email',
  email_bounced: 'email_bounced',
  owner_id: 'owner_id',
  tags: 'tags',
  notes: 'notes',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  last_contact_date: 'last_contact_date',
};

/** DB column / API payload body key → FLS field_key */
export const CONTACT_DB_COLUMN_TO_FIELD_KEY: Record<string, string> = {
  first_name: 'first_name',
  last_name: 'last_name',
  email: 'email',
  alt_email: 'alt_email',
  phone_number: 'phone',
  mobile_number: 'mobile',
  alt_phone: 'alt_phone',
  job_title: 'job_title',
  department: 'department',
  linkedin_url: 'linkedin',
  twitter_handle: 'twitter',
  status_id: 'status',
  account_id: 'account',
  is_primary: 'is_primary',
  reporting_to_id: 'reporting_to',
  location: 'location',
  timezone: 'timezone',
  language: 'language',
  preferred_contact_method: 'preferred_contact_method',
  do_not_call: 'do_not_call',
  do_not_email: 'do_not_email',
  email_bounced: 'email_bounced',
  owner_id: 'owner_id',
  tags: 'tags',
  notes: 'notes',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_by: 'updated_by',
  last_contact_date: 'last_contact_date',
};
