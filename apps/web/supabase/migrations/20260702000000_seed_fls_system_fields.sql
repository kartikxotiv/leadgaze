/*
 * Migration: Seed System Fields for FLS Expansion
 * Date: 2026-07-02
 * Description: Populates core.entity_fields and core.field_access_rules 
 *              for Leads, Contacts, Accounts, Opportunities, Tickets, Customers, and Organizations.
 */

-- Seed for contacts

INSERT INTO core.entity_fields (
  workspace_id, product_key, entity_type, field_key, field_label, field_type, is_system, is_required, display_order, settings
)
SELECT 
  id as workspace_id,
  'sales' as product_key,
  'contacts' as entity_type,
  fields.field_key,
  fields.field_label,
  fields.field_type,
  true as is_system,
  false as is_required,
  fields.display_order,
  fields.settings::jsonb
FROM public.workspaces
CROSS JOIN (
  VALUES
    ('first_name', 'First Name', 'text', 10, '{"db_columns":["first_name"]}'::text),
    ('last_name', 'Last Name', 'text', 20, '{"db_columns":["last_name"]}'::text),
    ('email', 'Email', 'email', 30, '{"db_columns":["email"]}'::text),
    ('alt_email', 'Alt Email', 'email', 40, '{"db_columns":["alt_email"]}'::text),
    ('phone', 'Phone', 'phone', 50, '{"db_columns":["phone_number"]}'::text),
    ('mobile', 'Mobile', 'phone', 60, '{"db_columns":["mobile_number"]}'::text),
    ('alt_phone', 'Alt Phone', 'phone', 70, '{"db_columns":["alt_phone"]}'::text),
    ('job_title', 'Job Title', 'text', 80, '{"db_columns":["job_title"]}'::text),
    ('department', 'Department', 'text', 90, '{"db_columns":["department"]}'::text),
    ('linkedin', 'LinkedIn', 'url', 100, '{"db_columns":["linkedin_url"]}'::text),
    ('twitter', 'Twitter', 'text', 110, '{"db_columns":["twitter_handle"]}'::text),
    ('status', 'Status', 'status', 120, '{"db_columns":["status_id"],"relation_keys":["status"]}'::text),
    ('account', 'Account', 'single_select', 130, '{"db_columns":["account_id"],"relation_keys":["account"]}'::text),
    ('is_primary', 'Is Primary', 'boolean', 140, '{"db_columns":["is_primary"]}'::text),
    ('reporting_to', 'Reports To', 'single_select', 150, '{"db_columns":["reporting_to_id"],"relation_keys":["reporting_to"]}'::text),
    ('location', 'Location', 'text', 160, '{"db_columns":["location"]}'::text),
    ('timezone', 'Timezone', 'text', 170, '{"db_columns":["timezone"]}'::text),
    ('language', 'Language', 'text', 180, '{"db_columns":["language"]}'::text),
    ('preferred_contact_method', 'Preferred Contact Method', 'single_select', 190, '{"db_columns":["preferred_contact_method"]}'::text),
    ('do_not_call', 'Do Not Call', 'boolean', 200, '{"db_columns":["do_not_call"]}'::text),
    ('do_not_email', 'Do Not Email', 'boolean', 210, '{"db_columns":["do_not_email"]}'::text),
    ('email_bounced', 'Email Bounced', 'boolean', 220, '{"db_columns":["email_bounced"]}'::text),
    ('owner_id', 'Owner', 'user', 230, '{"db_columns":["owner_id"],"relation_keys":["owner"]}'::text),
    ('tags', 'Tags', 'tag', 240, '{"db_columns":["tags"]}'::text),
    ('notes', 'Notes', 'textarea', 250, '{"db_columns":["notes"]}'::text),
    ('created_by', 'Created By', 'user', 260, '{"db_columns":["created_by"],"relation_keys":["created_by_account"]}'::text),
    ('created_at', 'Created On', 'datetime', 270, '{"db_columns":["created_at"]}'::text),
    ('updated_by', 'Last Updated By', 'user', 280, '{"db_columns":["updated_by"],"relation_keys":["updated_by_account"]}'::text),
    ('last_contact_date', 'Last Contact Date', 'datetime', 290, '{"db_columns":["last_contact_date"]}'::text)
) AS fields(field_key, field_label, field_type, display_order, settings)
ON CONFLICT (workspace_id, product_key, entity_type, field_key) DO NOTHING;

-- Grant public access by default
INSERT INTO core.field_access_rules (workspace_id, field_id, access_type)
SELECT f.workspace_id, f.id, 'public'
FROM core.entity_fields f
WHERE f.entity_type = 'contacts'
ON CONFLICT (field_id) DO NOTHING;

-- Seed for leads

INSERT INTO core.entity_fields (
  workspace_id, product_key, entity_type, field_key, field_label, field_type, is_system, is_required, display_order, settings
)
SELECT 
  id as workspace_id,
  'sales' as product_key,
  'leads' as entity_type,
  fields.field_key,
  fields.field_label,
  fields.field_type,
  true as is_system,
  false as is_required,
  fields.display_order,
  fields.settings::jsonb
FROM public.workspaces
CROSS JOIN (
  VALUES
    ('name', 'Name', 'text', 10, '{"db_columns":["first_name","last_name"]}'::text),
    ('first_name', 'First Name', 'text', 20, '{"db_columns":["first_name"]}'::text),
    ('last_name', 'Last Name', 'text', 30, '{"db_columns":["last_name"]}'::text),
    ('job_title', 'Job Title', 'text', 40, '{"db_columns":["job_title"]}'::text),
    ('email', 'Email', 'email', 50, '{"db_columns":["email"]}'::text),
    ('alt_email', 'Alt Email', 'email', 60, '{"db_columns":["alt_email"]}'::text),
    ('phone', 'Phone', 'phone', 70, '{"db_columns":["phone_number"]}'::text),
    ('mobile', 'Mobile', 'phone', 80, '{"db_columns":["mobile_number"]}'::text),
    ('company', 'Company', 'text', 90, '{"db_columns":["company_name"]}'::text),
    ('company_website', 'Company Website', 'url', 100, '{"db_columns":["company_website"]}'::text),
    ('company_linkedin', 'Company LinkedIn', 'url', 110, '{"db_columns":["company_linkedin_url"]}'::text),
    ('linkedin', 'LinkedIn', 'url', 120, '{"db_columns":["linkedin_url"]}'::text),
    ('department', 'Department', 'text', 130, '{"db_columns":["department"]}'::text),
    ('industry', 'Industry', 'single_select', 140, '{"db_columns":["industry_id"],"relation_keys":["industry"]}'::text),
    ('company_size', 'Company Size', 'single_select', 150, '{"db_columns":["company_size"]}'::text),
    ('location', 'Location', 'text', 160, '{"db_columns":["location"]}'::text),
    ('timezone', 'Timezone', 'text', 170, '{"db_columns":["timezone"]}'::text),
    ('status', 'Status', 'status', 180, '{"db_columns":["status_id"],"relation_keys":["status"]}'::text),
    ('source', 'Source', 'single_select', 190, '{"db_columns":["source_id"],"relation_keys":["source"]}'::text),
    ('trigger', 'Trigger', 'text', 200, '{"db_columns":["trigger"]}'::text),
    ('notes', 'Notes', 'textarea', 210, '{"db_columns":["notes"]}'::text),
    ('score', 'Score', 'number', 220, '{"db_columns":["score"]}'::text),
    ('owner_id', 'Owner', 'user', 230, '{"db_columns":["owner_id"],"relation_keys":["owner"]}'::text),
    ('tags', 'Tags', 'tag', 240, '{"db_columns":["tags"]}'::text),
    ('created_by', 'Created By', 'user', 250, '{"db_columns":["created_by"],"relation_keys":["created_by_account"]}'::text),
    ('created_at', 'Created On', 'datetime', 260, '{"db_columns":["created_at"]}'::text),
    ('updated_by', 'Last Updated By', 'user', 270, '{"db_columns":["updated_by"],"relation_keys":["updated_by_account"]}'::text),
    ('last_contact_date', 'Last Contact Date', 'datetime', 280, '{"db_columns":["last_contact_date"]}'::text),
    ('next_step', 'Next Step', 'textarea', 290, '{"db_columns":["next_step"]}'::text),
    ('lead_source', 'Lead Source', 'text', 300, '{"db_columns":["lead_source"]}'::text)
) AS fields(field_key, field_label, field_type, display_order, settings)
ON CONFLICT (workspace_id, product_key, entity_type, field_key) DO NOTHING;

-- Grant public access by default
INSERT INTO core.field_access_rules (workspace_id, field_id, access_type)
SELECT f.workspace_id, f.id, 'public'
FROM core.entity_fields f
WHERE f.entity_type = 'leads'
ON CONFLICT (field_id) DO NOTHING;

-- Seed for accounts

INSERT INTO core.entity_fields (
  workspace_id, product_key, entity_type, field_key, field_label, field_type, is_system, is_required, display_order, settings
)
SELECT 
  id as workspace_id,
  'sales' as product_key,
  'accounts' as entity_type,
  fields.field_key,
  fields.field_label,
  fields.field_type,
  true as is_system,
  false as is_required,
  fields.display_order,
  fields.settings::jsonb
FROM public.workspaces
CROSS JOIN (
  VALUES
    ('account_name', 'Account Name', 'text', 10, '{"db_columns":["account_name"]}'::text),
    ('website', 'Website', 'url', 20, '{"db_columns":["website"]}'::text),
    ('phone', 'Phone', 'phone', 30, '{"db_columns":["phone_number"]}'::text),
    ('industry', 'Industry', 'single_select', 40, '{"db_columns":["industry_id"],"relation_keys":["industry"]}'::text),
    ('company_size', 'Company Size', 'single_select', 50, '{"db_columns":["company_size"]}'::text),
    ('annual_revenue', 'Annual Revenue', 'currency', 60, '{"db_columns":["annual_revenue"]}'::text),
    ('employee_count', 'Employee Count', 'number', 70, '{"db_columns":["employee_count"]}'::text),
    ('status', 'Status', 'status', 80, '{"db_columns":["status_id"],"relation_keys":["status"]}'::text),
    ('account_type', 'Account Type', 'single_select', 90, '{"db_columns":["account_type"]}'::text),
    ('billing_street', 'Billing Street', 'text', 100, '{"db_columns":["billing_street"]}'::text),
    ('billing_city', 'Billing City', 'text', 110, '{"db_columns":["billing_city"]}'::text),
    ('billing_state', 'Billing State', 'text', 120, '{"db_columns":["billing_state"]}'::text),
    ('billing_postal_code', 'Billing Postal Code', 'text', 130, '{"db_columns":["billing_postal_code"]}'::text),
    ('billing_country', 'Billing Country', 'text', 140, '{"db_columns":["billing_country"]}'::text),
    ('shipping_street', 'Shipping Street', 'text', 150, '{"db_columns":["shipping_street"]}'::text),
    ('shipping_city', 'Shipping City', 'text', 160, '{"db_columns":["shipping_city"]}'::text),
    ('shipping_state', 'Shipping State', 'text', 170, '{"db_columns":["shipping_state"]}'::text),
    ('shipping_postal_code', 'Shipping Postal Code', 'text', 180, '{"db_columns":["shipping_postal_code"]}'::text),
    ('shipping_country', 'Shipping Country', 'text', 190, '{"db_columns":["shipping_country"]}'::text),
    ('linkedin', 'LinkedIn', 'url', 200, '{"db_columns":["linkedin_url"]}'::text),
    ('twitter', 'Twitter', 'text', 210, '{"db_columns":["twitter_handle"]}'::text),
    ('owner_id', 'Owner', 'user', 220, '{"db_columns":["owner_id"],"relation_keys":["owner"]}'::text),
    ('parent_account', 'Parent Account', 'single_select', 230, '{"db_columns":["parent_account_id"],"relation_keys":["parent_account"]}'::text),
    ('customer_since', 'Customer Since', 'datetime', 240, '{"db_columns":["customer_since"]}'::text),
    ('last_activity_date', 'Last Activity Date', 'datetime', 250, '{"db_columns":["last_activity_date"]}'::text),
    ('total_revenue', 'Total Revenue', 'currency', 260, '{"db_columns":["total_revenue"]}'::text),
    ('tags', 'Tags', 'tag', 270, '{"db_columns":["tags"]}'::text),
    ('description', 'Description', 'textarea', 280, '{"db_columns":["description"]}'::text),
    ('created_by', 'Created By', 'user', 290, '{"db_columns":["created_by"],"relation_keys":["created_by_account"]}'::text),
    ('created_at', 'Created On', 'datetime', 300, '{"db_columns":["created_at"]}'::text),
    ('updated_by', 'Last Updated By', 'user', 310, '{"db_columns":["updated_by"],"relation_keys":["updated_by_account"]}'::text)
) AS fields(field_key, field_label, field_type, display_order, settings)
ON CONFLICT (workspace_id, product_key, entity_type, field_key) DO NOTHING;

-- Grant public access by default
INSERT INTO core.field_access_rules (workspace_id, field_id, access_type)
SELECT f.workspace_id, f.id, 'public'
FROM core.entity_fields f
WHERE f.entity_type = 'accounts'
ON CONFLICT (field_id) DO NOTHING;

-- Seed for opportunities

INSERT INTO core.entity_fields (
  workspace_id, product_key, entity_type, field_key, field_label, field_type, is_system, is_required, display_order, settings
)
SELECT 
  id as workspace_id,
  'sales' as product_key,
  'opportunities' as entity_type,
  fields.field_key,
  fields.field_label,
  fields.field_type,
  true as is_system,
  false as is_required,
  fields.display_order,
  fields.settings::jsonb
FROM public.workspaces
CROSS JOIN (
  VALUES
    ('opportunity_name', 'Opportunity Name', 'text', 10, '{"db_columns":["opportunity_name"]}'::text),
    ('description', 'Description', 'textarea', 20, '{"db_columns":["description"]}'::text),
    ('stage', 'Stage', 'status', 30, '{"db_columns":["stage_id"],"relation_keys":["stage"]}'::text),
    ('account', 'Account', 'single_select', 40, '{"db_columns":["account_id"],"relation_keys":["account"]}'::text),
    ('primary_contact', 'Primary Contact', 'single_select', 50, '{"db_columns":["primary_contact_id"],"relation_keys":["primary_contact"]}'::text),
    ('amount', 'Amount', 'currency', 60, '{"db_columns":["amount"]}'::text),
    ('currency', 'Currency', 'single_select', 70, '{"db_columns":["currency"]}'::text),
    ('probability', 'Probability (%)', 'number', 80, '{"db_columns":["probability"]}'::text),
    ('expected_revenue', 'Expected Revenue', 'currency', 90, '{"db_columns":["expected_revenue"]}'::text),
    ('expected_close_date', 'Expected Close Date', 'date', 100, '{"db_columns":["expected_close_date"]}'::text),
    ('actual_close_date', 'Actual Close Date', 'date', 110, '{"db_columns":["actual_close_date"]}'::text),
    ('priority', 'Priority', 'single_select', 120, '{"db_columns":["priority"]}'::text),
    ('opportunity_type', 'Type', 'single_select', 130, '{"db_columns":["opportunity_type"]}'::text),
    ('lead_source', 'Lead Source', 'text', 140, '{"db_columns":["lead_source"]}'::text),
    ('campaign', 'Campaign', 'single_select', 150, '{"db_columns":["campaign_id"],"relation_keys":["campaign"]}'::text),
    ('owner_id', 'Owner', 'user', 160, '{"db_columns":["owner_id"],"relation_keys":["owner"]}'::text),
    ('is_closed', 'Is Closed', 'boolean', 170, '{"db_columns":["is_closed"]}'::text),
    ('is_won', 'Is Won', 'boolean', 180, '{"db_columns":["is_won"]}'::text),
    ('close_reason', 'Close Reason', 'textarea', 190, '{"db_columns":["close_reason"]}'::text),
    ('competitor', 'Competitor', 'text', 200, '{"db_columns":["competitor"]}'::text),
    ('tags', 'Tags', 'tag', 210, '{"db_columns":["tags"]}'::text),
    ('created_by', 'Created By', 'user', 220, '{"db_columns":["created_by"],"relation_keys":["created_by_account"]}'::text),
    ('created_at', 'Created On', 'datetime', 230, '{"db_columns":["created_at"]}'::text),
    ('updated_by', 'Last Updated By', 'user', 240, '{"db_columns":["updated_by"],"relation_keys":["updated_by_account"]}'::text)
) AS fields(field_key, field_label, field_type, display_order, settings)
ON CONFLICT (workspace_id, product_key, entity_type, field_key) DO NOTHING;

-- Grant public access by default
INSERT INTO core.field_access_rules (workspace_id, field_id, access_type)
SELECT f.workspace_id, f.id, 'public'
FROM core.entity_fields f
WHERE f.entity_type = 'opportunities'
ON CONFLICT (field_id) DO NOTHING;

-- Seed for tickets

INSERT INTO core.entity_fields (
  workspace_id, product_key, entity_type, field_key, field_label, field_type, is_system, is_required, display_order, settings
)
SELECT 
  id as workspace_id,
  'service-cloud' as product_key,
  'tickets' as entity_type,
  fields.field_key,
  fields.field_label,
  fields.field_type,
  true as is_system,
  false as is_required,
  fields.display_order,
  fields.settings::jsonb
FROM public.workspaces
CROSS JOIN (
  VALUES
    ('ticket_number', 'Ticket #', 'number', 10, '{"db_columns":["ticket_number"]}'::text),
    ('subject', 'Subject', 'text', 20, '{"db_columns":["subject"]}'::text),
    ('description', 'Description', 'textarea', 30, '{"db_columns":["description"]}'::text),
    ('source', 'Source', 'single_select', 40, '{"db_columns":["source"]}'::text),
    ('status', 'Status', 'status', 50, '{"db_columns":["status_id"],"relation_keys":["status"]}'::text),
    ('priority', 'Priority', 'single_select', 60, '{"db_columns":["priority_id"],"relation_keys":["priority"]}'::text),
    ('category', 'Category', 'single_select', 70, '{"db_columns":["category_id"],"relation_keys":["category"]}'::text),
    ('customer', 'Customer', 'single_select', 80, '{"db_columns":["customer_id"],"relation_keys":["customer"]}'::text),
    ('organization', 'Organization', 'single_select', 90, '{"db_columns":["organization_id"],"relation_keys":["organization"]}'::text),
    ('assigned_agent', 'Assigned Agent', 'user', 100, '{"db_columns":["assigned_agent_id"],"relation_keys":["assigned_agent"]}'::text),
    ('assigned_team', 'Assigned Team', 'single_select', 110, '{"db_columns":["assigned_team_id"],"relation_keys":["assigned_team"]}'::text),
    ('due_at', 'Due Date', 'datetime', 120, '{"db_columns":["due_at"]}'::text),
    ('tags', 'Tags', 'tag', 130, '{"db_columns":["tags"]}'::text),
    ('created_at', 'Created On', 'datetime', 140, '{"db_columns":["created_at"]}'::text)
) AS fields(field_key, field_label, field_type, display_order, settings)
ON CONFLICT (workspace_id, product_key, entity_type, field_key) DO NOTHING;

-- Grant public access by default
INSERT INTO core.field_access_rules (workspace_id, field_id, access_type)
SELECT f.workspace_id, f.id, 'public'
FROM core.entity_fields f
WHERE f.entity_type = 'tickets'
ON CONFLICT (field_id) DO NOTHING;

-- Seed for customers

INSERT INTO core.entity_fields (
  workspace_id, product_key, entity_type, field_key, field_label, field_type, is_system, is_required, display_order, settings
)
SELECT 
  id as workspace_id,
  'service-cloud' as product_key,
  'customers' as entity_type,
  fields.field_key,
  fields.field_label,
  fields.field_type,
  true as is_system,
  false as is_required,
  fields.display_order,
  fields.settings::jsonb
FROM public.workspaces
CROSS JOIN (
  VALUES
    ('name', 'Name', 'text', 10, '{"db_columns":["name"]}'::text),
    ('email', 'Email', 'email', 20, '{"db_columns":["email"]}'::text),
    ('phone', 'Phone', 'phone', 30, '{"db_columns":["phone"]}'::text),
    ('job_title', 'Job Title', 'text', 40, '{"db_columns":["job_title"]}'::text),
    ('organization', 'Organization', 'single_select', 50, '{"db_columns":["organization_id"],"relation_keys":["organization"]}'::text),
    ('timezone', 'Timezone', 'text', 60, '{"db_columns":["timezone"]}'::text),
    ('locale', 'Locale', 'text', 70, '{"db_columns":["locale"]}'::text),
    ('tags', 'Tags', 'tag', 80, '{"db_columns":["tags"]}'::text)
) AS fields(field_key, field_label, field_type, display_order, settings)
ON CONFLICT (workspace_id, product_key, entity_type, field_key) DO NOTHING;

-- Grant public access by default
INSERT INTO core.field_access_rules (workspace_id, field_id, access_type)
SELECT f.workspace_id, f.id, 'public'
FROM core.entity_fields f
WHERE f.entity_type = 'customers'
ON CONFLICT (field_id) DO NOTHING;

-- Seed for organizations

INSERT INTO core.entity_fields (
  workspace_id, product_key, entity_type, field_key, field_label, field_type, is_system, is_required, display_order, settings
)
SELECT 
  id as workspace_id,
  'service-cloud' as product_key,
  'organizations' as entity_type,
  fields.field_key,
  fields.field_label,
  fields.field_type,
  true as is_system,
  false as is_required,
  fields.display_order,
  fields.settings::jsonb
FROM public.workspaces
CROSS JOIN (
  VALUES
    ('name', 'Name', 'text', 10, '{"db_columns":["name"]}'::text),
    ('email', 'Email', 'email', 20, '{"db_columns":["email"]}'::text),
    ('phone', 'Phone', 'phone', 30, '{"db_columns":["phone"]}'::text),
    ('website', 'Website', 'url', 40, '{"db_columns":["website"]}'::text),
    ('industry', 'Industry', 'text', 50, '{"db_columns":["industry"]}'::text),
    ('address_line_1', 'Address Line 1', 'text', 60, '{"db_columns":["address_line_1"]}'::text),
    ('city', 'City', 'text', 70, '{"db_columns":["city"]}'::text),
    ('state', 'State', 'text', 80, '{"db_columns":["state"]}'::text),
    ('country', 'Country', 'text', 90, '{"db_columns":["country"]}'::text),
    ('owner_id', 'Owner', 'user', 100, '{"db_columns":["owner_id"],"relation_keys":["owner"]}'::text),
    ('tags', 'Tags', 'tag', 110, '{"db_columns":["tags"]}'::text)
) AS fields(field_key, field_label, field_type, display_order, settings)
ON CONFLICT (workspace_id, product_key, entity_type, field_key) DO NOTHING;

-- Grant public access by default
INSERT INTO core.field_access_rules (workspace_id, field_id, access_type)
SELECT f.workspace_id, f.id, 'public'
FROM core.entity_fields f
WHERE f.entity_type = 'organizations'
ON CONFLICT (field_id) DO NOTHING;
