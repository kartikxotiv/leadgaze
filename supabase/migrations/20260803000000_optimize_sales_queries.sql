-- ==============================================================================
-- Optimize Opportunities, Contacts, and Accounts Queries
-- Creates database views for fast relational sorting and pagination
-- Enforces RLS with security_invoker = true
-- ==============================================================================

-- 1. Create a View for Optimized Opportunities List
CREATE OR REPLACE VIEW public.vw_crm_opportunities_list WITH (security_invoker = true) AS
SELECT 
    o.id,
    o.workspace_id,
    o.opportunity_name,
    o.amount,
    o.currency,
    o.expected_close_date,
    o.probability,
    o.priority,
    o.opportunity_type,
    o.lead_source,
    o.description,
    o.competitor,
    o.is_closed,
    o.is_won,
    o.owner_id,
    o.created_by,
    o.updated_by,
    o.created_at,
    o.updated_at,
    
    -- Stage info
    o.stage_id,
    jsonb_build_object(
        'id', stg.id,
        'status_name', stg.status_name,
        'status_key', stg.status_key,
        'color', stg.color,
        'icon', stg.icon
    ) as stage,
    stg.status_name as stage_name,
    
    -- Account info
    o.account_id,
    o.primary_contact_id,
    jsonb_build_object(
        'id', acc.id,
        'account_name', acc.account_name
    ) as account,
    acc.account_name as account_name,
    
    -- Owner info
    jsonb_build_object(
        'id', own.id,
        'name', own.name,
        'email', own.email
    ) as owner,
    own.name as owner_name,

    -- Creator info
    jsonb_build_object(
        'id', cb.id,
        'name', cb.name,
        'email', cb.email
    ) as created_by_account,
    cb.name as created_by_account_name,
    
    -- Updater info
    jsonb_build_object(
        'id', ub.id,
        'name', ub.name,
        'email', ub.email
    ) as updated_by_account,
    ub.name as updated_by_account_name
FROM public.crm_opportunities o
LEFT JOIN public.entity_statuses stg ON stg.id = o.stage_id
LEFT JOIN public.crm_accounts acc ON acc.id = o.account_id
LEFT JOIN public.accounts own ON own.id = o.owner_id
LEFT JOIN public.accounts cb ON cb.id = o.created_by
LEFT JOIN public.accounts ub ON ub.id = o.updated_by;

ALTER VIEW public.vw_crm_opportunities_list SET (security_invoker = true);
GRANT SELECT ON public.vw_crm_opportunities_list TO authenticated, anon, service_role;


-- 2. Create a View for Optimized Contacts List
CREATE OR REPLACE VIEW public.vw_crm_contacts_list WITH (security_invoker = true) AS
SELECT 
    c.id,
    c.workspace_id,
    c.first_name,
    c.last_name,
    c.email,
    c.alt_email,
    c.phone_number,
    c.mobile_number,
    c.alt_phone,
    c.job_title,
    c.department,
    c.location,
    c.timezone,
    c.language,
    c.preferred_contact_method,
    c.do_not_call,
    c.do_not_email,
    c.linkedin_url,
    c.twitter_handle,
    c.owner_id,
    c.created_by,
    c.updated_by,
    c.notes,
    c.created_at,
    c.updated_at,
    
    -- Status info
    c.status_id,
    jsonb_build_object(
        'id', s.id,
        'status_name', s.status_name,
        'color', s.color
    ) as status,
    s.status_name as status_name,

    -- Account info
    c.account_id,
    jsonb_build_object(
        'id', acc.id,
        'account_name', acc.account_name
    ) as account,
    acc.account_name as account_name,
    
    -- Owner info
    jsonb_build_object(
        'id', own.id,
        'name', own.name,
        'email', own.email
    ) as owner,
    own.name as owner_name,

    -- Creator info
    jsonb_build_object(
        'id', cb.id,
        'name', cb.name,
        'email', cb.email
    ) as created_by_account,
    cb.name as created_by_account_name,
    
    -- Updater info
    jsonb_build_object(
        'id', ub.id,
        'name', ub.name,
        'email', ub.email
    ) as updated_by_account,
    ub.name as updated_by_account_name
FROM public.crm_contacts c
LEFT JOIN public.entity_statuses s ON s.id = c.status_id
LEFT JOIN public.crm_accounts acc ON acc.id = c.account_id
LEFT JOIN public.accounts own ON own.id = c.owner_id
LEFT JOIN public.accounts cb ON cb.id = c.created_by
LEFT JOIN public.accounts ub ON ub.id = c.updated_by;

ALTER VIEW public.vw_crm_contacts_list SET (security_invoker = true);
GRANT SELECT ON public.vw_crm_contacts_list TO authenticated, anon, service_role;


-- 3. Create a View for Optimized Accounts List
CREATE OR REPLACE VIEW public.vw_crm_accounts_list WITH (security_invoker = true) AS
SELECT 
    a.id,
    a.workspace_id,
    a.account_name,
    a.website,
    a.phone_number,
    a.company_size,
    a.annual_revenue,
    a.employee_count,
    a.account_type,
    a.billing_street,
    a.billing_city,
    a.billing_state,
    a.billing_postal_code,
    a.billing_country,
    a.shipping_street,
    a.shipping_city,
    a.shipping_state,
    a.shipping_postal_code,
    a.shipping_country,
    a.linkedin_url,
    a.twitter_handle,
    a.owner_id,
    a.created_by,
    a.updated_by,
    a.created_from_lead_id,
    a.created_at,
    a.updated_at,
    
    -- Status info
    a.status_id,
    jsonb_build_object(
        'id', s.id,
        'status_name', s.status_name,
        'color', s.color
    ) as status,
    s.status_name as status_name,

    -- Industry info
    a.industry_id,
    jsonb_build_object(
        'id', ind.id,
        'industry_name', ind.industry_name
    ) as industry,
    ind.industry_name as industry_name,
    
    -- Owner info
    jsonb_build_object(
        'id', own.id,
        'name', own.name,
        'email', own.email
    ) as owner,
    own.name as owner_name,

    -- Creator info
    jsonb_build_object(
        'id', cb.id,
        'name', cb.name,
        'email', cb.email
    ) as created_by_account,
    cb.name as created_by_account_name,
    
    -- Updater info
    jsonb_build_object(
        'id', ub.id,
        'name', ub.name,
        'email', ub.email
    ) as updated_by_account,
    ub.name as updated_by_account_name
FROM public.crm_accounts a
LEFT JOIN public.entity_statuses s ON s.id = a.status_id
LEFT JOIN public.crm_industries ind ON ind.id = a.industry_id
LEFT JOIN public.accounts own ON own.id = a.owner_id
LEFT JOIN public.accounts cb ON cb.id = a.created_by
LEFT JOIN public.accounts ub ON ub.id = a.updated_by;

ALTER VIEW public.vw_crm_accounts_list SET (security_invoker = true);
GRANT SELECT ON public.vw_crm_accounts_list TO authenticated, anon, service_role;

