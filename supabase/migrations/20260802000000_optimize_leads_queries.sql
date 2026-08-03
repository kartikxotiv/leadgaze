-- ==============================================================================
-- Optimize Leads Queries
-- Creates a view for fast relational sorting and an RPC for fetching lead details
-- ==============================================================================

-- 1. Create a View for Optimized Leads List
-- This view pre-joins relational tables so that standard pagination and sorting
-- work directly in the database without requiring full table fetches.
CREATE OR REPLACE VIEW public.vw_crm_leads_list AS
SELECT 
    l.id,
    l.workspace_id,
    l.first_name,
    l.last_name,
    l.email,
    l.alt_email,
    l.phone_number,
    l.mobile_number,
    l.company_name,
    l.job_title,
    l.department,
    l.location,
    l.trigger,
    l.created_at,
    l.updated_at,
    l.company_size,
    l.annual_revenue,
    l.owner_id,
    l.created_by,
    l.is_deleted,
    
    -- Status info
    l.status_id,
    jsonb_build_object(
        'id', s.id,
        'status_name', s.status_name,
        'status_key', s.status_key,
        'color', s.color,
        'icon', s.icon
    ) as status,
    
    -- Source info
    l.source_id,
    jsonb_build_object(
        'id', src.id,
        'source_name', src.source_name,
        'source_key', src.source_key,
        'color', src.color,
        'icon', src.icon
    ) as source,
    
    -- Industry info
    l.industry_id,
    jsonb_build_object(
        'id', ind.id,
        'industry_name', ind.industry_name
    ) as industry,
    
    -- Owner info
    jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'email', o.email
    ) as owner,

    -- Creator info
    jsonb_build_object(
        'id', cb.id,
        'name', cb.name,
        'email', cb.email
    ) as created_by_account,
    
    -- Updater info
    jsonb_build_object(
        'id', ub.id,
        'name', ub.name,
        'email', ub.email
    ) as updated_by_account,
    
    -- Account Names for Sorting
    cb.name as created_by_account_name,
    ub.name as updated_by_account_name
FROM public.crm_leads l
LEFT JOIN public.entity_statuses s ON s.id = l.status_id
LEFT JOIN public.lead_sources src ON src.id = l.source_id
LEFT JOIN public.crm_industries ind ON ind.id = l.industry_id
LEFT JOIN public.accounts o ON o.id = l.owner_id
LEFT JOIN public.accounts cb ON cb.id = l.created_by
LEFT JOIN public.accounts ub ON ub.id = l.updated_by;

-- Enable security definer for access in some RPCs if needed
-- Note: Views do not support RLS directly unless accessed securely. We will query this view using the service_role in our backend.

-- 2. Create RPC for fast related entities fetching
CREATE OR REPLACE FUNCTION get_lead_related_entities(p_lead_id UUID, p_workspace_id UUID)
RETURNS JSON AS $$
DECLARE
    v_accounts JSON;
    v_contacts JSON;
    v_opportunities JSON;
BEGIN
    -- Get related accounts
    SELECT COALESCE(json_agg(json_build_object('id', id)), '[]'::json)
    INTO v_accounts
    FROM public.crm_accounts
    WHERE created_from_lead_id = p_lead_id AND workspace_id = p_workspace_id AND is_deleted = false;

    -- Get related contacts
    SELECT COALESCE(json_agg(json_build_object('id', id)), '[]'::json)
    INTO v_contacts
    FROM public.crm_contacts
    WHERE created_from_lead_id = p_lead_id AND workspace_id = p_workspace_id AND is_deleted = false;

    -- Get related opportunities
    SELECT COALESCE(json_agg(json_build_object('id', id)), '[]'::json)
    INTO v_opportunities
    FROM public.crm_opportunities
    WHERE created_from_lead_id = p_lead_id AND workspace_id = p_workspace_id AND is_deleted = false;

    RETURN json_build_object(
        'accounts', v_accounts,
        'contacts', v_contacts,
        'opportunities', v_opportunities
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
