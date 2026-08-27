-- Optimization for fetching entity email activity using a single RPC call

CREATE OR REPLACE FUNCTION public.get_core_email_activity(
  p_workspace_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_limit INT,
  p_offset INT,
  p_user_id UUID,
  p_search TEXT DEFAULT NULL,
  p_direction TEXT DEFAULT NULL,
  p_account_email TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_entity_email TEXT;
  v_data JSONB;
BEGIN
  -- 1. Resolve Entity Email Address
  IF p_entity_type IN ('lead', 'sales_lead') THEN
    SELECT email INTO v_entity_email FROM public.crm_leads WHERE id = p_entity_id;
  ELSIF p_entity_type IN ('contact', 'sales_contact') THEN
    SELECT email INTO v_entity_email FROM public.crm_contacts WHERE id = p_entity_id;
  END IF;

  IF v_entity_email IS NOT NULL THEN
    v_entity_email := LOWER(TRIM(v_entity_email));
  END IF;

  -- 2. Fetch and aggregate emails efficiently
  WITH accessible_emails AS (
    SELECT id, LOWER(email) as email FROM core.email_accounts 
    WHERE workspace_id = p_workspace_id AND is_active = true
      AND (access_scope = 'workspace' OR owner_user_id = p_user_id)
  ),
  direct_emails AS (
    SELECT e.id, e.thread_id, e.thread_key, e.in_reply_to, e.internet_message_id, e.provider_message_id
    FROM core.emails e
    WHERE e.workspace_id = p_workspace_id
      AND e.is_deleted = false
      AND (
        e.id IN (SELECT email_id FROM core.email_relations WHERE entity_type = p_entity_type AND entity_id = p_entity_id)
        OR (v_entity_email IS NOT NULL AND (LOWER(e.from_email) = v_entity_email OR v_entity_email = ANY(SELECT LOWER(t) FROM jsonb_array_elements_text(e.to_emails) t) OR LOWER(e.to_email) = v_entity_email))
      )
  ),
  matching_emails AS (
    SELECT e.*
    FROM core.emails e
    WHERE e.workspace_id = p_workspace_id
      AND e.is_deleted = false
      AND (
        e.id IN (SELECT id FROM direct_emails)
        OR (e.thread_id IS NOT NULL AND e.thread_id IN (SELECT thread_id FROM direct_emails WHERE thread_id IS NOT NULL))
        OR (e.thread_key IS NOT NULL AND e.thread_key IN (SELECT thread_key FROM direct_emails WHERE thread_key IS NOT NULL))
        OR (e.in_reply_to IS NOT NULL AND e.in_reply_to IN (SELECT internet_message_id FROM direct_emails WHERE internet_message_id IS NOT NULL))
      )
      -- Optional filters
      AND (p_search IS NULL OR p_search = '' OR e.subject ILIKE '%' || p_search || '%' OR e.text_body ILIKE '%' || p_search || '%')
      AND (
        p_direction IS NULL OR p_direction = 'all'
        OR (p_direction = 'inbound' AND LOWER(e.to_email) IN (SELECT email FROM accessible_emails))
        OR (p_direction = 'outbound' AND LOWER(e.from_email) IN (SELECT email FROM accessible_emails))
      )
      AND (p_account_email IS NULL OR p_account_email = '' OR e.email_account_id IN (SELECT id FROM core.email_accounts WHERE LOWER(email) = LOWER(p_account_email)))
      -- Privacy filter (must involve an accessible account)
      AND (
         e.email_account_id IN (SELECT id FROM accessible_emails)
         OR LOWER(e.from_email) IN (SELECT email FROM accessible_emails)
         OR LOWER(e.to_email) IN (SELECT email FROM accessible_emails)
         OR EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(e.to_emails) t 
            WHERE LOWER(t) IN (SELECT email FROM accessible_emails)
         )
      )
      -- Lead email specific filter (prevent dumping the whole inbox if lead is a connected account)
      AND (
        e.id IN (SELECT id FROM direct_emails) -- directly linked overrides this check
        OR v_entity_email IS NULL
        OR (
          -- Lead is a participant
          (LOWER(e.from_email) = v_entity_email OR v_entity_email = ANY(SELECT LOWER(t) FROM jsonb_array_elements_text(e.to_emails) t) OR LOWER(e.to_email) = v_entity_email)
          -- AND Workspace is a participant (excluding the lead)
          AND (
             (LOWER(e.from_email) IN (SELECT email FROM accessible_emails WHERE email != v_entity_email))
             OR EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(e.to_emails) t 
                WHERE LOWER(t) IN (SELECT email FROM accessible_emails WHERE email != v_entity_email)
             )
             OR (LOWER(e.to_email) IN (SELECT email FROM accessible_emails WHERE email != v_entity_email))
          )
        )
      )
  ),
  counted AS (
    SELECT COUNT(*) as total_count FROM matching_emails
  ),
  paginated AS (
    SELECT m.*, 
      (SELECT jsonb_agg(row_to_json(r)) FROM core.email_relations r WHERE r.email_id = m.id) as email_relations 
    FROM matching_emails m
    ORDER BY m.received_at DESC NULLS LAST, m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT jsonb_build_object(
    'count', COALESCE((SELECT total_count FROM counted), 0),
    'data', COALESCE((SELECT jsonb_agg(row_to_json(paginated)) FROM paginated), '[]'::jsonb)
  ) INTO v_data;

  RETURN v_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_core_email_activity TO authenticated, service_role, anon;
